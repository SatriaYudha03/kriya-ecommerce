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
)

type PaymentHandler struct {
	repo      *OrderRepository
	midtrans  *service.MidtransService
	ports     Ports
	processor *PaymentProcessor
}

func NewPaymentHandler(repo *OrderRepository, midtrans *service.MidtransService, ports Ports, processor *PaymentProcessor) *PaymentHandler {
	return &PaymentHandler{repo: repo, midtrans: midtrans, ports: ports, processor: processor}
}

type midtransNotification struct {
	OrderID           string `json:"order_id"`
	StatusCode        string `json:"status_code"`
	GrossAmount       string `json:"gross_amount"`
	SignatureKey      string `json:"signature_key"`
	TransactionStatus string `json:"transaction_status"`
}

// MidtransNotification — webhook v2 (RENCANA §7.6, §8.1 butir 3): verifikasi signature lalu
// terapkan lewat PaymentProcessor (klasifikasi + Transition/anomali, lihat
// RENCANA-PAYMENT-LIFECYCLE Fase 4). Idempoten: notifikasi duplikat di-no-op.
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
	if err := h.processor.Apply(c.Request.Context(), PaymentNotification{
		MidtransOrderID: notif.OrderID, TransactionStatus: notif.TransactionStatus,
		GrossAmount: notif.GrossAmount, Raw: body,
	}); err != nil {
		if errors.Is(err, ErrPaymentNotFound) {
			httpx.RespondError(c, http.StatusNotFound, "not_found", "order tidak ditemukan")
			return
		}
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal memproses notifikasi")
		return
	}
	c.JSON(http.StatusOK, httpx.Response{Data: map[string]string{"status": "ok"}})
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
// dulu) ke Midtrans, lalu menerapkannya lewat PaymentProcessor yang sama dengan webhook.
// Dipanggil FE setelah popup Snap selesai dan saat halaman order pending dibuka.
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
	midtransOrderIDs, err := openMidtransOrderIDs(ctx, h.repo.db, order.ID)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal mengambil data pembayaran")
		return
	}
	var lastErr error
	reached := false
	for _, mid := range midtransOrderIDs {
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
		raw, _ := json.Marshal(st)
		// Attempt lama yang expire/cancel tidak mematikan order — aturan itu dijaga
		// classifyNotification (hanya attempt active yang boleh menutup order).
		if err := h.processor.Apply(ctx, PaymentNotification{
			MidtransOrderID: mid, TransactionStatus: st.TransactionStatus,
			GrossAmount: st.GrossAmount, Raw: raw,
		}); err != nil {
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
