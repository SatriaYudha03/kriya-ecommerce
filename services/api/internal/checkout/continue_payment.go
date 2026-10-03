package checkout

import (
	"context"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kriya-commerce/api/internal/httpx"
	"github.com/kriya-commerce/api/internal/service"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// minPaymentWindow — sisa waktu minimum ke payment_due_at agar attempt baru masih masuk
// akal dibuat (Snap expiry dalam menit; di bawah ini pembeli praktis tidak sempat bayar).
const minPaymentWindow = 2 * time.Minute

var (
	ErrOrderNotPayable     = errors.New("pesanan tidak menunggu pembayaran")
	ErrPaymentWindowClosed = errors.New("batas waktu pembayaran sudah lewat")
)

// ContinuePaymentResponse — respons POST /orders/:id/pay (bentuk sama dengan jalur lama
// di internal/customer supaya FE tidak berubah).
type ContinuePaymentResponse struct {
	SnapToken         string    `json:"snap_token"`
	MidtransClientKey string    `json:"midtrans_client_key"`
	ExpiresAt         time.Time `json:"expires_at"`
}

type continueAttempt struct {
	ID              string
	MidtransOrderID string
	SnapToken       *string
	ExpiresAt       *time.Time
}

type continuePlan struct {
	Reuse     bool // kembalikan attempt aktif apa adanya
	Supersede bool // attempt aktif rusak (token NULL / kedaluwarsa) -> superseded, buat baru
}

// planContinuePayment — RENCANA-PAYMENT-LIFECYCLE Fase 3. Fungsi murni. Tenggat bayar
// (dueAt) tidak pernah diperpanjang: attempt baru hanya pengganti attempt yang rusak.
func planContinuePayment(now time.Time, status Status, dueAt time.Time, active *continueAttempt) (continuePlan, error) {
	if status != StatusPendingPayment {
		return continuePlan{}, ErrOrderNotPayable
	}
	if dueAt.Sub(now) < minPaymentWindow {
		return continuePlan{}, ErrPaymentWindowClosed
	}
	if active == nil {
		return continuePlan{}, nil
	}
	if active.SnapToken != nil && *active.SnapToken != "" && active.ExpiresAt != nil && now.Before(*active.ExpiresAt) {
		return continuePlan{Reuse: true}, nil
	}
	return continuePlan{Supersede: true}, nil
}

// snapExpiryMinutes dibulatkan ke bawah supaya transaksi Midtrans tidak hidup melewati
// tenggat order.
func snapExpiryMinutes(now, dueAt time.Time) int {
	m := int(dueAt.Sub(now) / time.Minute)
	if m < 1 {
		return 1
	}
	return m
}

type continueOrderRow struct {
	ID           string
	Status       string
	Total        int
	PaymentDueAt *time.Time
	CreatedAt    time.Time
}

type continueResult struct {
	reuse      *continueAttempt
	newAttempt PaymentAttempt
	superseded *continueAttempt
	dueAt      time.Time
	total      int
}

// ContinuePayment — POST /orders/:id/pay: lanjut bayar order pending. Satu-satunya jalur
// pembuatan attempt selain CreateOrder (jalur lama internal/customer dihapus, temuan T4).
func (h *PaymentHandler) ContinuePayment(c *gin.Context) {
	userID, ok := httpx.UserID(c)
	if !ok || userID == "" {
		httpx.RespondError(c, http.StatusUnauthorized, "unauthorized", "Sesi tidak valid")
		return
	}
	orderID := c.Param("id")
	if _, err := uuid.Parse(orderID); err != nil {
		httpx.RespondError(c, http.StatusNotFound, "not_found", "Pesanan tidak ditemukan")
		return
	}
	ctx := c.Request.Context()

	res, err := h.prepareAttempt(ctx, orderID, userID)
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		httpx.RespondError(c, http.StatusNotFound, "not_found", "Pesanan tidak ditemukan")
		return
	case errors.Is(err, ErrOrderNotPayable):
		httpx.RespondError(c, http.StatusConflict, "conflict", "Pesanan tidak dapat dibayar karena status bukan pending_payment")
		return
	case errors.Is(err, ErrPaymentWindowClosed):
		httpx.RespondError(c, http.StatusConflict, "conflict", "Batas waktu pembayaran pesanan ini sudah lewat")
		return
	case err != nil:
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal menyiapkan pembayaran")
		return
	}

	if res.reuse != nil {
		c.JSON(http.StatusOK, httpx.Response{Data: ContinuePaymentResponse{
			SnapToken: *res.reuse.SnapToken, MidtransClientKey: h.midtrans.ClientKey(),
			ExpiresAt: res.reuse.ExpiresAt.UTC(),
		}})
		return
	}

	// Snap di luar transaksi DB (pola sama dengan CreateOrder).
	snapToken, snapErr := h.midtrans.CreateSnapTransactionWithExpiry(
		res.newAttempt.MidtransOrderID, res.total, snapExpiryMinutes(time.Now(), res.dueAt))
	if snapErr != nil {
		log.Printf("continue payment: snap gagal order=%s attempt=%s: %v", orderID, res.newAttempt.MidtransOrderID, snapErr)
		// Attempt tanpa token tidak boleh tetap "active" (temuan T3) — tandai failed agar
		// panggilan berikutnya membuat attempt baru.
		if err := h.repo.db.WithContext(context.Background()).Table("payment_attempts").
			Where("id = ?", res.newAttempt.ID).Update("status", "failed").Error; err != nil {
			log.Printf("continue payment: gagal menandai attempt %s failed: %v", res.newAttempt.ID, err)
		}
		httpx.RespondError(c, http.StatusBadGateway, "payment_error", "Gagal membuat transaksi pembayaran")
		return
	}
	if err := h.repo.UpdateAttemptSnapToken(res.newAttempt.ID, snapToken); err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal menyimpan token pembayaran")
		return
	}
	if res.superseded != nil && res.superseded.SnapToken != nil && *res.superseded.SnapToken != "" {
		// Attempt lama sempat punya token: pastikan tidak bisa dibayar lagi (cegah bayar dobel).
		if err := h.midtrans.CancelTransaction(res.superseded.MidtransOrderID); err != nil {
			log.Printf("continue payment: cancel attempt lama %s gagal: %v", res.superseded.MidtransOrderID, err)
		}
	}
	c.JSON(http.StatusOK, httpx.Response{Data: ContinuePaymentResponse{
		SnapToken: snapToken, MidtransClientKey: h.midtrans.ClientKey(), ExpiresAt: res.dueAt.UTC(),
	}})
}

// prepareAttempt mengunci order (klik ganda diserialkan) lalu memakai ulang attempt aktif
// atau menyiapkan attempt pengganti dengan expires_at = payment_due_at.
func (h *PaymentHandler) prepareAttempt(ctx context.Context, orderID, userID string) (continueResult, error) {
	var res continueResult
	err := h.repo.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var order continueOrderRow
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Table("orders").
			Select("id, status, total, payment_due_at, created_at").
			Where("id = ? AND user_id = ?", orderID, userID).Take(&order).Error; err != nil {
			return err
		}
		dueAt := order.CreatedAt.Add(time.Duration(getStoreSettings(ctx, tx).PendingPaymentTTLMinutes) * time.Minute)
		if order.PaymentDueAt != nil {
			dueAt = *order.PaymentDueAt
		}

		var active *continueAttempt
		var row continueAttempt
		err := tx.Table("payment_attempts").Select("id, midtrans_order_id, snap_token, expires_at").
			Where("order_id = ? AND status = 'active'", orderID).Take(&row).Error
		if err == nil {
			active = &row
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		plan, err := planContinuePayment(time.Now(), Status(order.Status), dueAt, active)
		if err != nil {
			return err
		}
		res.dueAt, res.total = dueAt, order.Total
		if plan.Reuse {
			res.reuse = active
			return nil
		}
		if plan.Supersede {
			if err := tx.Table("payment_attempts").Where("id = ?", active.ID).
				Update("status", "superseded").Error; err != nil {
				return err
			}
			res.superseded = active
		}
		midtransOrderID, err := service.GenerateOrderID()
		if err != nil {
			return err
		}
		res.newAttempt = PaymentAttempt{OrderID: orderID, MidtransOrderID: midtransOrderID, Status: "active", ExpiresAt: &dueAt}
		return tx.Create(&res.newAttempt).Error
	})
	return res, err
}
