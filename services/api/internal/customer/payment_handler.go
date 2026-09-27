package customer

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/httpx"
	"github.com/kriya-commerce/api/internal/service"
)

type PaymentHandler struct {
	repo              *PaymentRepository
	midtrans          *service.MidtransService
	midtransClientKey string
}

func NewPaymentHandler(repo *PaymentRepository, midtrans *service.MidtransService, midtransClientKey string) *PaymentHandler {
	return &PaymentHandler{
		repo:              repo,
		midtrans:          midtrans,
		midtransClientKey: midtransClientKey,
	}
}

func (h *PaymentHandler) PayOrder(c *gin.Context) {
	userID := c.GetString("user_id")
	orderID := c.Param("id")

	order, err := h.repo.GetOrder(orderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "INTERNAL_ERROR", Message: "Gagal mengambil data pesanan"},
		})
		return
	}
	if order == nil {
		c.JSON(http.StatusNotFound, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "NOT_FOUND", Message: "Pesanan tidak ditemukan"},
		})
		return
	}

	if order.UserID != userID {
		c.JSON(http.StatusForbidden, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "FORBIDDEN", Message: "Akses ditolak"},
		})
		return
	}

	if order.Status != "pending_payment" {
		c.JSON(http.StatusConflict, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "CONFLICT", Message: "Pesanan tidak dapat dibayar karena status bukan pending_payment"},
		})
		return
	}

	attempt, err := h.repo.GetActiveAttempt(orderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "INTERNAL_ERROR", Message: "Gagal memeriksa payment attempt"},
		})
		return
	}

	if attempt != nil {
		if time.Now().Before(attempt.ExpiresAt) {
			c.JSON(http.StatusOK, httpx.Response{Data: ContinuePaymentResponse{
				SnapToken:         attempt.SnapToken,
				MidtransClientKey: h.midtransClientKey,
				ExpiresAt:         attempt.ExpiresAt.Format(time.RFC3339),
			}})
			return
		}
		if err := h.repo.SupersedeAttempt(attempt.ID); err != nil {
			c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
				Error: httpx.ErrorDetail{Code: "INTERNAL_ERROR", Message: "Gagal update attempt lama"},
			})
			return
		}
	}

	ttlMinutes, err := h.repo.GetPendingPaymentTTL()
	if err != nil {
		ttlMinutes = 1440
	}

	// Generate KRIYA-XXXXXXXX (8 chars alphanumeric uppercase)
	randomStr := generateRandomString(8)
	midtransOrderID := fmt.Sprintf("KRIYA-%s", randomStr)
	
	// Create snap transaction
	snapToken, err := h.midtrans.CreateSnapTransaction(midtransOrderID, order.Total)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "INTERNAL_ERROR", Message: "Gagal membuat transaksi midtrans"},
		})
		return
	}

	expiresAt := time.Now().Add(time.Duration(ttlMinutes) * time.Minute)

	newAttempt := &PaymentAttempt{
		OrderID:         orderID,
		MidtransOrderID: midtransOrderID,
		SnapToken:       snapToken,
		Status:          "active",
		ExpiresAt:       expiresAt,
	}

	if err := h.repo.CreateAttempt(newAttempt); err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "INTERNAL_ERROR", Message: "Gagal menyimpan attempt baru"},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: ContinuePaymentResponse{
		SnapToken:         snapToken,
		MidtransClientKey: h.midtransClientKey,
		ExpiresAt:         expiresAt.Format(time.RFC3339),
	}})
}

var letterRunes = []rune("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")

func generateRandomString(n int) string {
	b := make([]rune, n)
	for i := range b {
		idx, _ := rand.Int(rand.Reader, big.NewInt(int64(len(letterRunes))))
		b[i] = letterRunes[idx.Int64()]
	}
	return string(b)
}
