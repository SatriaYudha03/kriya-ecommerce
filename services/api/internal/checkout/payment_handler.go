package checkout

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/service"
)

type PaymentHandler struct {
	repo     *OrderRepository
	midtrans *service.MidtransService
}

func NewPaymentHandler(repo *OrderRepository, midtrans *service.MidtransService) *PaymentHandler {
	return &PaymentHandler{repo: repo, midtrans: midtrans}
}

type midtransNotification struct {
	OrderID           string `json:"order_id"`
	StatusCode        string `json:"status_code"`
	GrossAmount       string `json:"gross_amount"`
	SignatureKey      string `json:"signature_key"`
	TransactionStatus string `json:"transaction_status"`
}

// MidtransNotification menangani webhook Midtrans: verifikasi signature SHA-512,
// idempoten, dan update status order + payment (KRIYA-MASTER.md bagian Midtrans).
func (h *PaymentHandler) MidtransNotification(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error: ErrorDetail{Code: "validation_error", Message: "Body tidak valid"},
		})
		return
	}

	var notif midtransNotification
	if err := json.Unmarshal(body, &notif); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error: ErrorDetail{Code: "validation_error", Message: "Body tidak valid"},
		})
		return
	}

	if !h.midtrans.VerifySignature(notif.OrderID, notif.StatusCode, notif.GrossAmount, notif.SignatureKey) {
		c.JSON(http.StatusForbidden, ErrorResponse{
			Error: ErrorDetail{Code: "forbidden", Message: "signature tidak valid"},
		})
		return
	}

	orderStatus, ok := service.MapTransactionStatus(notif.TransactionStatus)
	if !ok {
		// transaction_status tidak dikenal — tetap 200 supaya Midtrans tidak retry,
		// tapi tidak mengubah apa pun.
		c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "ignored"}})
		return
	}

	if err := h.repo.ApplyPaymentUpdate(notif.OrderID, orderStatus, notif.TransactionStatus, body); err != nil {
		if errors.Is(err, ErrPaymentNotFound) {
			c.JSON(http.StatusNotFound, ErrorResponse{
				Error: ErrorDetail{Code: "not_found", Message: "order tidak ditemukan"},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error: ErrorDetail{Code: "internal", Message: "Gagal memproses notifikasi"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "ok"}})
}
