package checkout

import (
	"context"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type TransitionInput struct {
	OrderID        string
	To             Status
	Actor          ActorType
	ActorID        *string
	Note           string
	Courier        *string
	TrackingNumber *string
	CancelReason   *string
}

type InvalidTransitionError struct{ From, To Status }

func (e *InvalidTransitionError) Error() string {
	return "transisi tidak valid: " + string(e.From) + " -> " + string(e.To)
}

type MissingShipmentInfoError struct{}

func (e *MissingShipmentInfoError) Error() string { return "courier dan tracking_number wajib diisi" }

type orderStatusRow struct {
	ID     string
	Status string
}

type orderTransitionUpdate struct {
	Status         string     `gorm:"column:status"`
	UpdatedAt      time.Time  `gorm:"column:updated_at"`
	PaidAt         *time.Time `gorm:"column:paid_at"`
	ShippedAt      *time.Time `gorm:"column:shipped_at"`
	CompletedAt    *time.Time `gorm:"column:completed_at"`
	CancelledAt    *time.Time `gorm:"column:cancelled_at"`
	CancelReason   *string    `gorm:"column:cancel_reason"`
	Courier        *string    `gorm:"column:courier"`
	TrackingNumber *string    `gorm:"column:tracking_number"`
}

// transitionPlan adalah hasil murni (tanpa DB) dari memvalidasi & menyusun efek satu
// transisi — dipisah dari Transition supaya bisa diuji tanpa koneksi database, mengikuti
// pola evaluateCouponCore di internal/promo/discount.go.
type transitionPlan struct {
	From             Status
	To               Status
	Update           orderTransitionUpdate
	Event            OrderEvent
	ConfirmDiscounts bool
	ReleaseInventory bool
	ReleaseDiscounts bool
}

func planTransition(from Status, in TransitionInput) (transitionPlan, error) {
	if !CanTransition(from, in.To, in.Actor) {
		return transitionPlan{}, &InvalidTransitionError{From: from, To: in.To}
	}
	if in.To == StatusShipped {
		if in.Courier == nil || *in.Courier == "" || in.TrackingNumber == nil || *in.TrackingNumber == "" {
			return transitionPlan{}, &MissingShipmentInfoError{}
		}
	}

	now := time.Now()
	plan := transitionPlan{From: from, To: in.To, Update: orderTransitionUpdate{Status: string(in.To), UpdatedAt: now}}

	switch in.To {
	case StatusPaid:
		plan.Update.PaidAt = &now
		plan.ConfirmDiscounts = true
	case StatusShipped:
		plan.Update.ShippedAt = &now
		plan.Update.Courier = in.Courier
		plan.Update.TrackingNumber = in.TrackingNumber
	case StatusCompleted:
		plan.Update.CompletedAt = &now
	case StatusCancelled:
		plan.Update.CancelledAt = &now
		plan.Update.CancelReason = in.CancelReason
		plan.ReleaseInventory = true
		plan.ReleaseDiscounts = true
	case StatusExpired:
		plan.ReleaseInventory = true
		plan.ReleaseDiscounts = true
	}

	fromStr := string(from)
	note := in.Note
	if note == "" && in.CancelReason != nil {
		note = *in.CancelReason
	}
	if in.To == StatusShipped && in.TrackingNumber != nil {
		note = *in.TrackingNumber
	}
	plan.Event = OrderEvent{
		OrderID:        in.OrderID,
		FromStatus:     &fromStr,
		ToStatus:       string(in.To),
		ActorType:      in.Actor,
		ActorID:        in.ActorID,
		Note:           note,
		NotifyCustomer: true,
	}

	return plan, nil
}

// Transition mengunci baris order (FOR UPDATE), memvalidasi transisi lewat CanTransition,
// mengisi stempel waktu, menjalankan efek samping RENCANA §6.1 lewat Ports, lalu mencatat
// order_events (dengan notifikasi customer). Harus dipanggil di dalam transaksi (tx).
// Tidak memanggil Midtrans — pemanggil (webhook/CancelOrder) yang bertanggung jawab atas
// itu di luar transaksi.
//
// Mengembalikan status BARU (setelah transisi) supaya pemanggil bisa langsung
// membalasnya ke klien — konsisten dengan cara D2/D3/D5 memakai nilai baliknya lewat
// alias internal/orderflow.
func Transition(ctx context.Context, tx *gorm.DB, p Ports, in TransitionInput) (Status, error) {
	var row orderStatusRow
	if err := tx.WithContext(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).
		Table("orders").Select("id, status").Where("id = ?", in.OrderID).Take(&row).Error; err != nil {
		return "", err
	}

	from := Status(row.Status)
	plan, err := planTransition(from, in)
	if err != nil {
		return from, err
	}

	if err := tx.WithContext(ctx).Table("orders").Where("id = ?", in.OrderID).Updates(&plan.Update).Error; err != nil {
		return plan.From, err
	}
	if plan.ConfirmDiscounts && p.Discounts != nil {
		if err := p.Discounts.Confirm(ctx, tx, in.OrderID); err != nil {
			return plan.From, err
		}
	}
	if plan.ReleaseInventory && p.Inventory != nil {
		if err := p.Inventory.Release(ctx, tx, in.OrderID, in.ActorID); err != nil {
			return plan.From, err
		}
	}
	if plan.ReleaseDiscounts && p.Discounts != nil {
		if err := p.Discounts.Release(ctx, tx, in.OrderID); err != nil {
			return plan.From, err
		}
	}
	if p.Events != nil {
		if err := p.Events.Record(ctx, tx, plan.Event); err != nil {
			return plan.From, err
		}
	}

	return plan.To, nil
}
