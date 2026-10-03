package aftersales

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/checkout"
	"github.com/kriya-commerce/api/internal/httpx"
	"github.com/kriya-commerce/api/internal/orderflow"
	"github.com/kriya-commerce/api/internal/service"
	"gorm.io/gorm"
)

const (
	shippingCostJawaBali = 150000
	shippingCostLuar     = 300000
)

type OrderHandler struct {
	repo      *OrderRepository
	midtrans  *service.MidtransService
	ports     checkout.Ports
	processor *checkout.PaymentProcessor
}

func NewOrderHandler(repo *OrderRepository, midtrans *service.MidtransService, ports checkout.Ports, processor *checkout.PaymentProcessor) *OrderHandler {
	return &OrderHandler{repo: repo, midtrans: midtrans, ports: ports, processor: processor}
}

func (h *OrderHandler) ListOrders(c *gin.Context) {
	userID, _ := httpx.UserID(c)
	page, limit := httpx.ParsePagination(c)
	if limit > 50 {
		limit = 50
	}
	status := c.Query("status")
	locale := httpx.ResolveLocale(c)

	orders, total, err := h.repo.ListByUser(userID, page, limit, status)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal mengambil pesanan")
		return
	}

	res := make([]OrderResponse, 0, len(orders))
	for _, o := range orders {
		res = append(res, ToOrderResponse(o, locale))
	}

	c.JSON(http.StatusOK, httpx.Response{
		Data: res,
		Meta: &httpx.Meta{Page: page, Limit: limit, Total: total},
	})
}

func (h *OrderHandler) GetOrder(c *gin.Context) {
	userID, _ := httpx.UserID(c)
	id := c.Param("id")
	locale := httpx.ResolveLocale(c)

	order, err := h.repo.GetByIDForUser(id, userID)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal mengambil pesanan")
		return
	}
	if order == nil {
		httpx.RespondError(c, http.StatusNotFound, "not_found", "Pesanan tidak ditemukan")
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: ToOrderResponse(*order, locale)})
}

// InternalOrderStatus dipakai chatbot n8n untuk cek status pesanan by order_id+email
// (header X-Internal-Key diverifikasi oleh middleware).
func (h *OrderHandler) InternalOrderStatus(c *gin.Context) {
	orderID := c.Query("order_id")
	email := c.Query("email")
	if orderID == "" || email == "" {
		httpx.RespondError(c, http.StatusBadRequest, "validation_error", "order_id dan email wajib diisi")
		return
	}

	order, err := h.repo.GetForInternalStatus(orderID, email)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal mengambil status pesanan")
		return
	}
	if order == nil {
		httpx.RespondError(c, http.StatusNotFound, "not_found", "Pesanan tidak ditemukan")
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: InternalOrderStatusResponse{
		OrderID:   order.ID,
		Status:    order.Status,
		Total:     order.Total,
		CreatedAt: order.CreatedAt,
	}})
}

func ptrStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func ToOrderResponse(o Order, locale string) OrderResponse {
	var addr ShippingAddressResponse
	_ = json.Unmarshal(o.ShippingAddress, &addr)

	itemsRes := make([]OrderItemResponse, 0, len(o.Items))
	for _, it := range o.Items {
		regPrice := it.Price
		if it.RegularPrice != nil {
			regPrice = *it.RegularPrice
		}
		
		itemsRes = append(itemsRes, OrderItemResponse{
			ID:             it.ID,
			VariantID:      it.VariantID,
			ProductSlug:    ptrStr(it.ProductSlug),
			ThumbnailURL:   thumbnailURL(it.ThumbnailURL),
			Name:           it.Name,
			SKU:            it.SKU,
			Color:          it.Color,
			Size:           it.Size,
			Qty:            it.Qty,
			Price:          it.Price,
			RegularPrice:   regPrice,
			DiscountAmount: it.DiscountAmount,
			Subtotal:       it.Subtotal,
			RefundedQty:    it.RefundedQty,
			CanReview:      o.Status == "completed" && it.ReviewID == nil,
			ReviewID:       it.ReviewID,
		})
	}

	var shippingMethod *ShippingMethodResponse
	if o.ShippingMethodCode != nil {
		shippingMethod = &ShippingMethodResponse{
			Code:       *o.ShippingMethodCode,
			Name:       ptrStr(o.ShippingMethodName),
			EtaMinDays: 0,
			EtaMaxDays: 0,
		}
		if o.ShippingEtaMinDays != nil {
			shippingMethod.EtaMinDays = *o.ShippingEtaMinDays
		}
		if o.ShippingEtaMaxDays != nil {
			shippingMethod.EtaMaxDays = *o.ShippingEtaMaxDays
		}
	}

	paymentStatus := "failed"
	if o.Status == "pending_payment" {
		paymentStatus = "pending"
	}
	if o.Status == "paid" || o.Status == "processing" || o.Status == "shipped" || o.Status == "completed" {
		paymentStatus = "settlement"
	}
	if o.Status == "cancelled" || o.Status == "expired" {
		paymentStatus = o.Status
	}
	
	// Override with actual pa_status if available
	if o.PaStatus != nil {
		paymentStatus = *o.PaStatus
	}

	// Tenggat bayar order (payment_due_at, tidak pernah diperpanjang) lebih diutamakan
	// daripada expiry attempt aktif — attempt bisa tidak ada (mis. Snap gagal).
	deadline := o.PaExpiresAt
	if o.PaymentDueAt != nil {
		deadline = o.PaymentDueAt
	}
	canContinue := false
	if o.Status == "pending_payment" && paymentStatus != "settled" && paymentStatus != "expired" {
		if deadline == nil || time.Now().Before(*deadline) {
			canContinue = true
		}
	}

	payment := PaymentResponse{
		Status:      paymentStatus,
		CanContinue: canContinue,
		ExpiresAt:   deadline,
	}

	timeline := make([]TimelineEvent, 0, len(o.Events))
	for _, ev := range o.Events {
		timeline = append(timeline, TimelineEvent{
			Status:    ev.ToStatus,
			CreatedAt: ev.CreatedAt,
			Note:      ev.Note,
		})
	}

	notes := make([]OrderNoteResponse, 0, len(o.Notes))
	for _, n := range o.Notes {
		notes = append(notes, OrderNoteResponse{
			ID:                n.ID,
			Body:              n.Body,
			IsCustomerVisible: n.IsCustomerVisible,
			CreatedAt:         n.CreatedAt,
			AuthorName:        n.AuthorName,
		})
	}

	canCancel := o.Status == "pending_payment"
	canReturn := o.Status == "completed" // Simplification for now, might need time check

	return OrderResponse{
		ID:               o.ID,
		OrderNumber:      o.OrderNumber,
		Status:           o.Status,
		Items:            itemsRes,
		Subtotal:         o.Subtotal,
		DiscountTotal:    o.DiscountTotal,
		ShippingCost:     o.ShippingCost,
		ShippingDiscount: o.ShippingDiscount,
		TaxAmount:        o.TaxAmount,
		Total:            o.Total,
		CouponCode:       nil,
		ShippingMethod:   shippingMethod,
		ShippingAddress:  addr,
		CustomerNote:     o.CustomerNote,
		Courier:          o.Courier,
		TrackingNumber:   o.TrackingNumber,
		Payment:          payment,
		CanCancel:        canCancel,
		CanReturn:        canReturn,
		PaidAt:           o.PaidAt,
		ShippedAt:        o.ShippedAt,
		CompletedAt:      o.CompletedAt,
		CancelledAt:      o.CancelledAt,
		CreatedAt:        o.CreatedAt,
		Timeline:         timeline,
		Notes:            notes,
	}
}

type CancelOrderRequest struct {
	Reason string `json:"reason" binding:"required"`
}

func (h *OrderHandler) CancelOrder(c *gin.Context) {
	id := c.Param("id")
	userID, _ := httpx.UserID(c)

	var req CancelOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "validation_error", Message: "Alasan pembatalan wajib diisi"},
		})
		return
	}

	order, err := h.repo.GetByIDForUser(id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengambil pesanan"},
		})
		return
	}
	if order == nil {
		c.JSON(http.StatusNotFound, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "not_found", Message: "Pesanan tidak ditemukan"},
		})
		return
	}
	if order.UserID != userID {
		c.JSON(http.StatusForbidden, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "forbidden", Message: "Bukan pesanan Anda"},
		})
		return
	}
	if order.Status != "pending_payment" {
		c.JSON(http.StatusConflict, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "invalid_status", Message: "Hanya pesanan menunggu pembayaran yang dapat dibatalkan"},
		})
		return
	}

	// Batalkan di Midtrans DULU, baru order (RENCANA-PAYMENT-LIFECYCLE "celah 1"): kalau
	// Midtrans belum bisa dipastikan batal, order tetap pending supaya uang yang mungkin
	// masuk tidak jatuh ke order yang sudah ditutup.
	if err := checkout.ClosePayableAttempts(c.Request.Context(), h.repo.db, h.midtrans, h.processor, id); err != nil {
		respondClosePaymentError(c, id, err)
		return
	}

	var newStatus orderflow.Status
	err = h.repo.db.Transaction(func(tx *gorm.DB) error {
		in := orderflow.TransitionInput{
			OrderID:      id,
			To:           orderflow.StatusCancelled,
			Actor:        checkout.ActorCustomer,
			ActorID:      &userID,
			CancelReason: &req.Reason,
		}

		st, transErr := orderflow.Transition(c.Request.Context(), tx, h.ports, in)
		if transErr != nil {
			return transErr
		}
		newStatus = st
		return nil
	})

	if err != nil {
		var invalidErr *orderflow.InvalidTransitionError
		var missingShipmentErr *orderflow.MissingShipmentInfoError
		if errors.As(err, &invalidErr) || errors.As(err, &missingShipmentErr) {
			c.JSON(http.StatusConflict, httpx.ErrorResponse{
				Error: httpx.ErrorDetail{Code: "invalid_transition", Message: err.Error()},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal membatalkan pesanan"},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: map[string]string{"status": string(newStatus)}})
}

// respondClosePaymentError memetakan kegagalan checkout.ClosePayableAttempts saat
// membatalkan order pending (dipakai pembeli & admin).
func respondClosePaymentError(c *gin.Context, orderID string, err error) {
	switch {
	case errors.Is(err, checkout.ErrOrderAlreadyPaid):
		httpx.RespondError(c, http.StatusConflict, "invalid_status", "Pesanan sudah dibayar sehingga tidak dapat dibatalkan")
	case errors.Is(err, checkout.ErrPaymentStillPayable):
		log.Printf("cancel order %s: transaksi Midtrans belum bisa dipastikan batal: %v", orderID, err)
		httpx.RespondError(c, http.StatusBadGateway, "payment_error", "Gagal membatalkan transaksi di payment gateway. Silakan coba lagi.")
	default:
		log.Printf("cancel order %s: %v", orderID, err)
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal membatalkan pesanan")
	}
}
