package checkout

import (
	"github.com/kriya-commerce/api/internal/httpx"

	"encoding/json"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/service"
)

const (
	shippingCostJawaBali = 150000
	shippingCostLuar     = 300000
)

type OrderHandler struct {
	repo     *OrderRepository
	midtrans *service.MidtransService
}

func NewOrderHandler(repo *OrderRepository, midtrans *service.MidtransService) *OrderHandler {
	return &OrderHandler{repo: repo, midtrans: midtrans}
}

func (h *OrderHandler) CreateOrder(c *gin.Context) {
	lang := httpx.ResolveLocale(c)
	userID := c.GetString("user_id")

	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error: ErrorDetail{Code: "validation_error", Message: "Body tidak valid"},
		})
		return
	}

	shippingCost := shippingCostJawaBali
	if req.ShippingZone == "luar" {
		shippingCost = shippingCostLuar
	}

	shippingAddressJSON, err := json.Marshal(req.ShippingAddress)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error: ErrorDetail{Code: "internal", Message: "Gagal memproses alamat"},
		})
		return
	}

	items := make([]OrderItemInput, 0, len(req.Items))
	for _, it := range req.Items {
		items = append(items, OrderItemInput{VariantID: it.VariantID, Qty: it.Qty})
	}

	midtransOrderID, err := service.GenerateOrderID()
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error: ErrorDetail{Code: "internal", Message: "Gagal membuat order_id"},
		})
		return
	}

	order, orderItems, err := h.repo.CreateOrder(userID, items, req.ShippingZone, shippingCost, shippingAddressJSON, midtransOrderID, lang)
	if err != nil {
		var stockErr *InsufficientStockError
		var notFoundErr *VariantNotFoundError
		switch {
		case errors.As(err, &stockErr):
			c.JSON(http.StatusConflict, ErrorResponse{
				Error: ErrorDetail{Code: "conflict", Message: "Stok tidak cukup untuk salah satu produk"},
			})
		case errors.As(err, &notFoundErr):
			c.JSON(http.StatusBadRequest, ErrorResponse{
				Error: ErrorDetail{Code: "validation_error", Message: notFoundErr.Error()},
			})
		default:
			c.JSON(http.StatusInternalServerError, ErrorResponse{
				Error: ErrorDetail{Code: "internal", Message: "Gagal membuat order"},
			})
		}
		return
	}

	snapToken, err := h.midtrans.CreateSnapTransaction(midtransOrderID, order.Total)
	if err != nil {
		// Order & reservasi stok sudah dibuat di DB tapi Snap token gagal dibuat —
		// batalkan supaya tidak ada order "pending_payment" nyangkut tanpa cara bayar.
		if compErr := h.repo.CompensateFailedOrder(order.ID); compErr != nil {
			c.JSON(http.StatusInternalServerError, ErrorResponse{
				Error: ErrorDetail{Code: "internal", Message: "Gagal membuat transaksi pembayaran dan gagal membatalkan order"},
			})
			return
		}
		c.JSON(http.StatusBadGateway, ErrorResponse{
			Error: ErrorDetail{Code: "payment_error", Message: "Gagal membuat transaksi pembayaran"},
		})
		return
	}

	res := CreateOrderResponse{
		Order:             ToOrderResponse(*order, orderItems),
		SnapToken:         snapToken,
		MidtransClientKey: h.midtrans.ClientKey(),
	}
	c.JSON(http.StatusCreated, Response{Data: res})
}

// InternalOrderStatus dipakai chatbot n8n untuk cek status pesanan by order_id+email
// (header X-Internal-Key diverifikasi oleh middleware).

func ToOrderResponse(o Order, items []OrderItem) OrderResponse {
	var addr ShippingAddressResponse
	json.Unmarshal(o.ShippingAddress, &addr)

	itemsRes := make([]OrderItemResponse, 0, len(items))
	for _, it := range items {
		itemsRes = append(itemsRes, OrderItemResponse{
			Name:     it.Name,
			Color:    it.Color,
			Size:     it.Size,
			Qty:      it.Qty,
			Price:    it.Price,
			Subtotal: it.Subtotal,
		})
	}

	return OrderResponse{
		ID:              o.ID,
		Status:          o.Status,
		Items:           itemsRes,
		Subtotal:        o.Subtotal,
		ShippingCost:    o.ShippingCost,
		Total:           o.Total,
		ShippingAddress: addr,
		CreatedAt:       o.CreatedAt,
	}
}
