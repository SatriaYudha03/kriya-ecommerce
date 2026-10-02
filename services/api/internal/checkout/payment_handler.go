package checkout

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/httpx"
	"github.com/kriya-commerce/api/internal/service"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type PaymentHandler struct {
	repo     *OrderRepository
	midtrans *service.MidtransService
	ports    Ports
}

func NewPaymentHandler(repo *OrderRepository, midtrans *service.MidtransService, ports Ports) *PaymentHandler {
	return &PaymentHandler{repo: repo, midtrans: midtrans, ports: ports}
}

type midtransNotification struct {
	OrderID           string `json:"order_id"`
	StatusCode        string `json:"status_code"`
	GrossAmount       string `json:"gross_amount"`
	SignatureKey      string `json:"signature_key"`
	TransactionStatus string `json:"transaction_status"`
}

var ErrPaymentNotFound = errors.New("payment tidak ditemukan")

type paymentAttemptLockRow struct {
	ID      string
	OrderID string
}

type legacyPaymentLockRow struct {
	ID      string
	OrderID string
}

type orderLockRow struct {
	ID     string
	Status string
}

type paymentUpdate struct {
	TransactionStatus string `gorm:"column:transaction_status"`
	Raw               []byte `gorm:"column:raw"`
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

// MidtransNotification — webhook v2 (RENCANA §7.6, §8.1 butir 3): lookup attempt
// (fallback payments.midtrans_order_id untuk order pra-v2) -> update attempt/payments ->
// orderflow.Transition (paid/cancelled/expired, aktor payment_gateway) ->
// Discounts.Confirm sudah dijalankan di dalam Transition. Idempoten per order: notifikasi
// yang tidak mengubah status order (duplikat, atau status order sudah berbeda) di-no-op.
func (h *PaymentHandler) MidtransNotification(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		httpx.RespondError(c, http.StatusBadRequest, "validation_error", "Body tidak valid")
		return
	}
	var notif midtransNotification
	if err := json.Unmarshal(body, &notif); err != nil {
		httpx.RespondError(c, http.StatusBadRequest, "validation_error", "Body tidak valid")
		return
	}

	if !h.midtrans.VerifySignature(notif.OrderID, notif.StatusCode, notif.GrossAmount, notif.SignatureKey) {
		httpx.RespondError(c, http.StatusForbidden, "forbidden", "signature tidak valid")
		return
	}

	if _, ok := service.MapTransactionStatus(notif.TransactionStatus); !ok {
		// transaction_status tidak dikenal — tetap 200 supaya Midtrans tidak retry.
		c.JSON(http.StatusOK, httpx.Response{Data: map[string]string{"status": "ignored"}})
		return
	}

	if err := h.applyTransactionStatus(c.Request.Context(), notif.OrderID, notif.TransactionStatus, body); err != nil {
		if errors.Is(err, ErrPaymentNotFound) {
			httpx.RespondError(c, http.StatusNotFound, "not_found", "order tidak ditemukan")
			return
		}
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal memproses notifikasi")
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: map[string]string{"status": "ok"}})
}

// applyTransactionStatus — inti webhook, dipakai bersama oleh MidtransNotification (push)
// dan SyncPayment (pull): lookup attempt (fallback payments.midtrans_order_id) -> update
// attempt/payments -> Transition. transactionStatus harus sudah lolos MapTransactionStatus.
func (h *PaymentHandler) applyTransactionStatus(ctx context.Context, midtransOrderID, transactionStatus string, raw []byte) error {
	orderStatus, ok := service.MapTransactionStatus(transactionStatus)
	if !ok {
		return nil
	}
	newStatus := Status(orderStatus)

	return h.repo.db.Transaction(func(tx *gorm.DB) error {
		var attempt paymentAttemptLockRow
		attemptErr := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Table("payment_attempts").
			Select("id, order_id").Where("midtrans_order_id = ?", midtransOrderID).Take(&attempt).Error

		var orderID string
		if attemptErr != nil {
			if !errors.Is(attemptErr, gorm.ErrRecordNotFound) {
				return attemptErr
			}
			// Fallback: payments.midtrans_order_id (order pra-v2, RENCANA §7.6).
			var legacy legacyPaymentLockRow
			legacyErr := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Table("payments").
				Select("id, order_id").Where("midtrans_order_id = ?", midtransOrderID).Take(&legacy).Error
			if legacyErr != nil {
				if errors.Is(legacyErr, gorm.ErrRecordNotFound) {
					return ErrPaymentNotFound
				}
				return legacyErr
			}
			orderID = legacy.OrderID
			if err := tx.Table("payments").Where("id = ?", legacy.ID).
				Updates(&paymentUpdate{TransactionStatus: transactionStatus, Raw: raw}).Error; err != nil {
				return err
			}
		} else {
			orderID = attempt.OrderID
			if err := tx.Table("payment_attempts").Where("id = ?", attempt.ID).
				Update("status", attemptStatusFor(orderStatus)).Error; err != nil {
				return err
			}
		}

		var order orderLockRow
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Table("orders").
			Select("id, status").Where("id = ?", orderID).Take(&order).Error; err != nil {
			return err
		}
		if order.Status == orderStatus {
			// Idempoten: notifikasi duplikat atau attempt lama yang menyusul setelah
			// order sudah diselesaikan attempt lain — tidak ada yang perlu diubah lagi.
			return nil
		}

		_, transErr := Transition(ctx, tx, h.ports, TransitionInput{
			OrderID: orderID, To: newStatus, Actor: ActorPaymentGateway,
		})
		if transErr != nil {
			var invalidErr *InvalidTransitionError
			if errors.As(transErr, &invalidErr) {
				// Order sudah berpindah status lewat jalur lain (mis. dibatalkan admin)
				// sebelum notifikasi ini tiba — bukan kegagalan sistem, abaikan.
				return nil
			}
			return transErr
		}
		return nil
	})
}

type orderOwnerRow struct {
	ID     string
	UserID string
	Status string
}

// SyncPaymentResponse — respons POST /orders/:id/payment/sync.
type SyncPaymentResponse struct {
	Status string `json:"status"`
}

// SyncPayment — POST /orders/:id/payment/sync. Cadangan webhook: menanyakan status
// setiap midtrans_order_id milik order (attempt aktif/superseded + payments lama, terbaru
// dulu) ke Midtrans, lalu menerapkannya lewat jalur yang sama dengan webhook. Dipanggil
// FE setelah popup Snap selesai dan saat halaman order pending dibuka.
func (h *PaymentHandler) SyncPayment(c *gin.Context) {
	userID, ok := httpx.UserID(c)
	if !ok || userID == "" {
		httpx.RespondError(c, http.StatusUnauthorized, "unauthorized", "Sesi tidak valid")
		return
	}
	ctx := c.Request.Context()

	order, err := h.loadOwnedOrder(ctx, c.Param("id"), userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			httpx.RespondError(c, http.StatusNotFound, "not_found", "Pesanan tidak ditemukan")
			return
		}
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal mengambil pesanan")
		return
	}
	if order.Status != string(StatusPendingPayment) {
		c.JSON(http.StatusOK, httpx.Response{Data: SyncPaymentResponse{Status: order.Status}})
		return
	}

	midtransOrderIDs, err := h.midtransOrderIDsFor(ctx, order.ID)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal mengambil data pembayaran")
		return
	}

	var lastErr error
	reached := false
	for i, mid := range midtransOrderIDs {
		st, stErr := h.midtrans.GetTransactionStatus(mid)
		if stErr != nil {
			if !errors.Is(stErr, service.ErrTransactionNotFound) {
				lastErr = stErr
			} else {
				reached = true
			}
			continue
		}
		reached = true
		mapped, known := service.MapTransactionStatus(st.TransactionStatus)
		if !known || mapped == string(StatusPendingPayment) {
			continue
		}
		if mapped != string(StatusPaid) && i > 0 {
			// Attempt lama yang expire/cancel tidak boleh mematikan order selama attempt
			// terbaru masih berjalan — hanya "lunas" yang berlaku dari attempt mana pun.
			continue
		}
		raw, _ := json.Marshal(st)
		if err := h.applyTransactionStatus(ctx, mid, st.TransactionStatus, raw); err != nil {
			httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal memperbarui status pembayaran")
			return
		}
		if mapped == string(StatusPaid) {
			// Satu attempt lunas sudah cukup; attempt lain tidak perlu dicek.
			break
		}
	}
	if !reached && lastErr != nil {
		httpx.RespondError(c, http.StatusBadGateway, "payment_error", "Gagal menghubungi payment gateway")
		return
	}

	order, err = h.loadOwnedOrder(ctx, order.ID, userID)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal mengambil pesanan")
		return
	}
	c.JSON(http.StatusOK, httpx.Response{Data: SyncPaymentResponse{Status: order.Status}})
}

func (h *PaymentHandler) loadOwnedOrder(ctx context.Context, orderID, userID string) (orderOwnerRow, error) {
	var row orderOwnerRow
	err := h.repo.db.WithContext(ctx).Table("orders").Select("id, user_id, status").
		Where("id = ? AND user_id = ?", orderID, userID).Take(&row).Error
	return row, err
}

func (h *PaymentHandler) midtransOrderIDsFor(ctx context.Context, orderID string) ([]string, error) {
	var ids []string
	if err := h.repo.db.WithContext(ctx).Table("payment_attempts").
		Where("order_id = ? AND status IN ?", orderID, []string{"active", "superseded"}).
		Order("created_at DESC").Pluck("midtrans_order_id", &ids).Error; err != nil {
		return nil, err
	}
	var legacy []string
	if err := h.repo.db.WithContext(ctx).Table("payments").
		Where("order_id = ? AND midtrans_order_id IS NOT NULL", orderID).
		Pluck("midtrans_order_id", &legacy).Error; err != nil {
		return nil, err
	}
	return append(ids, legacy...), nil
}
