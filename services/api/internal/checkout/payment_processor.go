package checkout

import (
	"context"
	"errors"
	"log"

	"github.com/kriya-commerce/api/internal/service"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// PaymentNotification adalah satu status transaksi Midtrans yang mau diterapkan ke order —
// dari webhook (push), SyncPayment (pull), atau ExpirySweeper. TransactionStatus mentah
// (mis. "settlement"); GrossAmount string persis dari Midtrans ("150000.00", boleh kosong);
// Raw = payload asli untuk audit.
type PaymentNotification struct {
	MidtransOrderID   string
	TransactionStatus string
	GrossAmount       string
	Raw               []byte
}

// Jenis anomali (tabel payment_anomalies, migrasi 017).
const (
	AnomalyPaidAfterClose = "paid_after_close"
	AnomalyDoublePayment  = "double_payment"
)

type notificationAction int

const (
	actionIgnore            notificationAction = iota // tidak ada yang berubah (pending / duplikat)
	actionUpdateAttemptOnly                           // status attempt diperbarui, order tidak disentuh
	actionTransition                                  // attempt diperbarui + order ditransisikan
	actionAnomaly                                     // uang masuk tapi order tidak bisa menerimanya
)

type notificationDecision struct {
	Action      notificationAction
	AnomalyKind string
}

// classifyNotification — RENCANA-PAYMENT-LIFECYCLE Fase 4. Fungsi murni: memutuskan apa
// yang terjadi pada order & attempt untuk satu notifikasi. attemptPrev = status attempt
// SEBELUM notifikasi ini (active|superseded|settled|failed|expired).
//
// Aturan inti: uang yang masuk tidak pernah diabaikan diam-diam (anomali), dan hanya
// attempt yang sedang active yang boleh mematikan order (attempt lama yang expire/cancel
// tidak boleh membatalkan order yang sedang dibayar lewat attempt baru).
func classifyNotification(order Status, mapped Status, attemptPrev string) notificationDecision {
	switch mapped {
	case StatusPaid:
		if attemptPrev == "settled" {
			return notificationDecision{Action: actionIgnore}
		}
		switch order {
		case StatusPendingPayment:
			return notificationDecision{Action: actionTransition}
		case StatusCancelled, StatusExpired:
			return notificationDecision{Action: actionAnomaly, AnomalyKind: AnomalyPaidAfterClose}
		default:
			return notificationDecision{Action: actionAnomaly, AnomalyKind: AnomalyDoublePayment}
		}
	case StatusCancelled, StatusExpired:
		if attemptPrev == "settled" {
			return notificationDecision{Action: actionIgnore}
		}
		if attemptPrev == "active" && order == StatusPendingPayment {
			return notificationDecision{Action: actionTransition}
		}
		return notificationDecision{Action: actionUpdateAttemptOnly}
	default:
		return notificationDecision{Action: actionIgnore}
	}
}

// attemptStatusFor memetakan status order hasil MapTransactionStatus ke status
// payment_attempts (schema 008: active|superseded|settled|failed|expired).
func attemptStatusFor(orderStatus string) string {
	switch orderStatus {
	case "paid":
		return "settled"
	case "cancelled":
		return "failed"
	case "expired":
		return "expired"
	default:
		return "active"
	}
}

// legacyPrevStatus menerjemahkan payments.transaction_status (order pra-v2) ke kosakata
// status attempt supaya bisa diklasifikasi dengan aturan yang sama.
func legacyPrevStatus(transactionStatus string) string {
	if mapped, ok := service.MapTransactionStatus(transactionStatus); ok {
		return attemptStatusFor(mapped)
	}
	return "active"
}

var ErrPaymentNotFound = errors.New("payment tidak ditemukan")

// PaymentProcessor adalah satu-satunya jalur yang menerapkan status transaksi Midtrans ke
// order — dipakai webhook, SyncPayment, dan ExpirySweeper.
type PaymentProcessor struct {
	db    *gorm.DB
	ports Ports
}

func NewPaymentProcessor(db *gorm.DB, ports Ports) *PaymentProcessor {
	return &PaymentProcessor{db: db, ports: ports}
}

type paymentAttemptLockRow struct {
	ID      string
	OrderID string
	Status  string
}

type legacyPaymentLockRow struct {
	ID                string
	OrderID           string
	TransactionStatus *string
}

type orderLockRow struct {
	ID     string
	Status string
}

type paymentUpdate struct {
	TransactionStatus string `gorm:"column:transaction_status"`
	Raw               []byte `gorm:"column:raw"`
}

// Apply: lock attempt (fallback payments.midtrans_order_id untuk order pra-v2) -> lock
// order -> classifyNotification -> update attempt/payments -> Transition (aktor
// payment_gateway) atau catat anomali. Idempoten: notifikasi duplikat tidak mengubah apa pun.
func (p *PaymentProcessor) Apply(ctx context.Context, n PaymentNotification) error {
	mapped, ok := service.MapTransactionStatus(n.TransactionStatus)
	if !ok {
		return nil
	}
	newStatus := Status(mapped)
	var recorded *anomalyRecord
	err := p.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var attempt paymentAttemptLockRow
		attemptErr := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Table("payment_attempts").
			Select("id, order_id, status").Where("midtrans_order_id = ?", n.MidtransOrderID).Take(&attempt).Error
		var legacy legacyPaymentLockRow
		isLegacy := false
		if attemptErr != nil {
			if !errors.Is(attemptErr, gorm.ErrRecordNotFound) {
				return attemptErr
			}
			// Fallback: payments.midtrans_order_id (order pra-v2, RENCANA §7.6).
			legacyErr := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Table("payments").
				Select("id, order_id, transaction_status").Where("midtrans_order_id = ?", n.MidtransOrderID).Take(&legacy).Error
			if legacyErr != nil {
				if errors.Is(legacyErr, gorm.ErrRecordNotFound) {
					return ErrPaymentNotFound
				}
				return legacyErr
			}
			isLegacy = true
		}

		orderID, prev := attempt.OrderID, attempt.Status
		if isLegacy {
			orderID, prev = legacy.OrderID, "active"
			if legacy.TransactionStatus != nil {
				prev = legacyPrevStatus(*legacy.TransactionStatus)
			}
		}

		var order orderLockRow
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Table("orders").
			Select("id, status").Where("id = ?", orderID).Take(&order).Error; err != nil {
			return err
		}

		decision := classifyNotification(Status(order.Status), newStatus, prev)
		if decision.Action == actionIgnore {
			return nil
		}

		if isLegacy {
			if err := tx.Table("payments").Where("id = ?", legacy.ID).
				Updates(&paymentUpdate{TransactionStatus: n.TransactionStatus, Raw: n.Raw}).Error; err != nil {
				return err
			}
		} else if err := tx.Table("payment_attempts").Where("id = ?", attempt.ID).
			Update("status", attemptStatusFor(mapped)).Error; err != nil {
			return err
		}

		switch decision.Action {
		case actionTransition:
			_, transErr := Transition(ctx, tx, p.ports, TransitionInput{
				OrderID: orderID, To: newStatus, Actor: ActorPaymentGateway,
			})
			var invalidErr *InvalidTransitionError
			if transErr != nil && !errors.As(transErr, &invalidErr) {
				return transErr
			}
		case actionAnomaly:
			rec := anomalyRecord{
				OrderID: orderID, MidtransOrderID: n.MidtransOrderID, Kind: decision.AnomalyKind,
				OrderStatus: order.Status, TransactionStatus: n.TransactionStatus,
				GrossAmount: n.GrossAmount, Raw: n.Raw,
			}
			inserted, err := insertAnomaly(ctx, tx, rec)
			if err != nil {
				return err
			}
			if inserted {
				recorded = &rec
			}
		}
		return nil
	})
	if err == nil && recorded != nil {
		// Sinyal untuk log/alert: uang pembeli masuk tapi order tidak menerimanya — admin
		// wajib menindaklanjuti lewat /admin/payment-anomalies (refund manual).
		log.Printf("PAYMENT ANOMALY %s: order=%s midtrans_order_id=%s order_status=%s transaction_status=%s gross_amount=%s",
			recorded.Kind, recorded.OrderID, recorded.MidtransOrderID, recorded.OrderStatus,
			recorded.TransactionStatus, recorded.GrossAmount)
	}
	return err
}

// openMidtransOrderIDs — semua midtrans_order_id milik order yang mungkin masih hidup di
// Midtrans (attempt active/superseded + payments lama), terbaru dulu.
func openMidtransOrderIDs(ctx context.Context, db *gorm.DB, orderID string) ([]string, error) {
	var ids []string
	if err := db.WithContext(ctx).Table("payment_attempts").
		Where("order_id = ? AND status IN ?", orderID, []string{"active", "superseded"}).
		Order("created_at DESC").Pluck("midtrans_order_id", &ids).Error; err != nil {
		return nil, err
	}
	var legacy []string
	if err := db.WithContext(ctx).Table("payments").
		Where("order_id = ? AND midtrans_order_id IS NOT NULL", orderID).
		Pluck("midtrans_order_id", &legacy).Error; err != nil {
		return nil, err
	}
	return append(ids, legacy...), nil
}
