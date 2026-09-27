package checkout

import (
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

	orderStatus, ok := service.MapTransactionStatus(notif.TransactionStatus)
	if !ok {
		// transaction_status tidak dikenal — tetap 200 supaya Midtrans tidak retry.
		c.JSON(http.StatusOK, httpx.Response{Data: map[string]string{"status": "ignored"}})
		return
	}
	newStatus := Status(orderStatus)

	err = h.repo.db.Transaction(func(tx *gorm.DB) error {
		var attempt paymentAttemptLockRow
		attemptErr := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Table("payment_attempts").
			Select("id, order_id").Where("midtrans_order_id = ?", notif.OrderID).Take(&attempt).Error

		var orderID string
		if attemptErr != nil {
			if !errors.Is(attemptErr, gorm.ErrRecordNotFound) {
				return attemptErr
			}
			// Fallback: payments.midtrans_order_id (order pra-v2, RENCANA §7.6).
			var legacy legacyPaymentLockRow
			legacyErr := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Table("payments").
				Select("id, order_id").Where("midtrans_order_id = ?", notif.OrderID).Take(&legacy).Error
			if legacyErr != nil {
				if errors.Is(legacyErr, gorm.ErrRecordNotFound) {
					return ErrPaymentNotFound
				}
				return legacyErr
			}
			orderID = legacy.OrderID
			if err := tx.Table("payments").Where("id = ?", legacy.ID).
				Updates(&paymentUpdate{TransactionStatus: notif.TransactionStatus, Raw: body}).Error; err != nil {
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

		_, transErr := Transition(c.Request.Context(), tx, h.ports, TransitionInput{
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

	if err != nil {
		if errors.Is(err, ErrPaymentNotFound) {
			httpx.RespondError(c, http.StatusNotFound, "not_found", "order tidak ditemukan")
			return
		}
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal memproses notifikasi")
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: map[string]string{"status": "ok"}})
}
