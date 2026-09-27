package checkout

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/httpx"
	"github.com/kriya-commerce/api/internal/service"
)

type OrderHandler struct {
	repo     *OrderRepository
	midtrans *service.MidtransService
	ports    Ports
}

func NewOrderHandler(repo *OrderRepository, midtrans *service.MidtransService, ports Ports) *OrderHandler {
	return &OrderHandler{repo: repo, midtrans: midtrans, ports: ports}
}

// CreateOrder — POST /orders v2 (RENCANA §7.6, §8.1 butir 2). Transaksi DB (lihat
// OrderRepository.CreateOrder) sudah commit sebelum Snap dipanggil; kalau Snap gagal,
// order dikompensasi (stok+kupon dilepas, order dihapus) dan klien menerima 502.
func (h *OrderHandler) CreateOrder(c *gin.Context) {
	locale := httpx.ResolveLocale(c)
	userID, ok := httpx.UserID(c)
	if !ok || userID == "" {
		httpx.RespondError(c, http.StatusUnauthorized, "unauthorized", "Sesi tidak valid")
		return
	}

	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondError(c, http.StatusBadRequest, "validation_error", "Body tidak valid")
		return
	}

	ctx := c.Request.Context()
	created, err := h.repo.CreateOrder(ctx, userID, req, locale, h.ports)
	if err != nil {
		mapCreateOrderError(c, err)
		return
	}

	settings := getStoreSettings(ctx, h.repo.db)
	snapToken, snapErr := h.midtrans.CreateSnapTransactionWithExpiry(created.Attempt.MidtransOrderID, created.Order.Total, settings.PendingPaymentTTLMinutes)
	if snapErr != nil {
		if compErr := h.repo.CompensateFailedOrder(context.Background(), created.Order.ID, h.ports); compErr != nil {
			httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal membuat transaksi pembayaran dan gagal membatalkan order")
			return
		}
		httpx.RespondError(c, http.StatusBadGateway, "payment_error", "Gagal membuat transaksi pembayaran")
		return
	}
	if err := h.repo.UpdateAttemptSnapToken(created.Attempt.ID, snapToken); err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal menyimpan token pembayaran")
		return
	}
	created.Attempt.SnapToken = &snapToken

	res := CreateOrderResponse{
		Order:             ToOrderResponse(created.Order, created.Items, &created.Attempt, req.CouponCode),
		SnapToken:         snapToken,
		MidtransClientKey: h.midtrans.ClientKey(),
	}
	c.JSON(http.StatusCreated, httpx.Response{Data: res})
}

func mapCreateOrderError(c *gin.Context, err error) {
	var stockErr *StockProblemError
	var couponErr *CouponInvalidError
	var stockPortErr *InsufficientStockError
	switch {
	case errors.As(err, &stockErr):
		httpx.RespondError(c, http.StatusConflict, "conflict", "Stok atau ketersediaan salah satu produk bermasalah")
	case errors.As(err, &couponErr):
		httpx.RespondError(c, http.StatusConflict, "conflict", "Kupon tidak lagi valid: "+string(couponErr.Reason))
	case errors.As(err, &stockPortErr):
		httpx.RespondError(c, http.StatusConflict, "conflict", "Stok tidak cukup untuk salah satu produk")
	case errors.Is(err, ErrAddressNotFound):
		httpx.RespondError(c, http.StatusNotFound, "not_found", "Alamat tidak ditemukan")
	case errors.Is(err, ErrShippingMethodUnavailable):
		httpx.RespondError(c, http.StatusConflict, "conflict", "Metode pengiriman tidak tersedia untuk tujuan ini")
	default:
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal membuat order")
	}
}

// ToOrderResponse membangun bentuk <order> v2 (RENCANA §7.5) langsung dari hasil
// CreateOrder — dipakai HANYA di sini (bukan GET /orders, yang menjadi tanggung jawab D).
func ToOrderResponse(o Order, items []OrderItem, attempt *PaymentAttempt, couponCode *string) OrderResponse {
	var addr ShippingAddressResponse
	_ = json.Unmarshal(o.ShippingAddress, &addr)

	itemsRes := make([]OrderItemResponse, 0, len(items))
	for _, it := range items {
		regularPrice := it.Price
		if it.RegularPrice != nil {
			regularPrice = *it.RegularPrice
		}
		itemsRes = append(itemsRes, OrderItemResponse{
			ID: it.ID, VariantID: it.VariantID, ProductSlug: nil, ThumbnailURL: nil,
			Name: it.Name, SKU: it.SKU, Color: it.Color, Size: it.Size, Qty: it.Qty,
			Price: it.Price, RegularPrice: regularPrice, DiscountAmount: it.DiscountAmount,
			Subtotal: it.Subtotal, RefundedQty: 0, CanReview: false, ReviewID: nil,
		})
	}

	var shippingMethod *ShippingMethodResponse
	if o.ShippingMethodCode != nil {
		name := ""
		if o.ShippingMethodName != nil {
			name = *o.ShippingMethodName
		}
		sm := ShippingMethodResponse{Code: *o.ShippingMethodCode, Name: name}
		if o.ShippingEtaMinDays != nil {
			sm.EtaMinDays = *o.ShippingEtaMinDays
		}
		if o.ShippingEtaMaxDays != nil {
			sm.EtaMaxDays = *o.ShippingEtaMaxDays
		}
		shippingMethod = &sm
	}

	payment := PaymentResponse{Status: "pending", CanContinue: true, ExpiresAt: nil}
	if attempt != nil {
		payment.ExpiresAt = attempt.ExpiresAt
	}

	timeline := []TimelineEvent{{Status: o.Status, Note: nil, ActorType: string(ActorCustomer), CreatedAt: o.CreatedAt}}

	return OrderResponse{
		ID: o.ID, OrderNumber: o.OrderNumber, Status: o.Status, Items: itemsRes,
		Subtotal: o.Subtotal, DiscountTotal: o.DiscountTotal, ShippingCost: o.ShippingCost,
		ShippingDiscount: o.ShippingDiscount, TaxAmount: o.TaxAmount, Total: o.Total,
		CouponCode: couponCode, ShippingMethod: shippingMethod, ShippingAddress: addr,
		CustomerNote: o.CustomerNote, Courier: o.Courier, TrackingNumber: o.TrackingNumber,
		Payment: payment, CanCancel: o.Status == "pending_payment", CanReturn: false,
		PaidAt: o.PaidAt, ShippedAt: o.ShippedAt, CompletedAt: o.CompletedAt, CancelledAt: o.CancelledAt,
		CreatedAt: o.CreatedAt, Timeline: timeline,
	}
}
