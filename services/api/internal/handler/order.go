package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/model"
	"github.com/kriya-commerce/api/internal/repository"
	"github.com/kriya-commerce/api/internal/service"
)

const (
	shippingCostJawaBali = 150000
	shippingCostLuar     = 300000
)

type OrderHandler struct {
	repo     *repository.OrderRepository
	midtrans *service.MidtransService
}

func NewOrderHandler(repo *repository.OrderRepository, midtrans *service.MidtransService) *OrderHandler {
	return &OrderHandler{repo: repo, midtrans: midtrans}
}

func (h *OrderHandler) CreateOrder(c *gin.Context) {
	lang := resolveLocale(c)
	userID := c.GetString("user_id")

	var req model.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "validation_error", Message: "Body tidak valid"},
		})
		return
	}

	shippingCost := shippingCostJawaBali
	if req.ShippingZone == "luar" {
		shippingCost = shippingCostLuar
	}

	shippingAddressJSON, err := json.Marshal(req.ShippingAddress)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Gagal memproses alamat"},
		})
		return
	}

	items := make([]repository.OrderItemInput, 0, len(req.Items))
	for _, it := range req.Items {
		items = append(items, repository.OrderItemInput{VariantID: it.VariantID, Qty: it.Qty})
	}

	midtransOrderID, err := service.GenerateOrderID()
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Gagal membuat order_id"},
		})
		return
	}

	order, orderItems, err := h.repo.CreateOrder(userID, items, req.ShippingZone, shippingCost, shippingAddressJSON, midtransOrderID, lang)
	if err != nil {
		var stockErr *repository.InsufficientStockError
		var notFoundErr *repository.VariantNotFoundError
		switch {
		case errors.As(err, &stockErr):
			c.JSON(http.StatusConflict, model.ErrorResponse{
				Error: model.ErrorDetail{Code: "conflict", Message: "Stok tidak cukup untuk salah satu produk"},
			})
		case errors.As(err, &notFoundErr):
			c.JSON(http.StatusBadRequest, model.ErrorResponse{
				Error: model.ErrorDetail{Code: "validation_error", Message: notFoundErr.Error()},
			})
		default:
			c.JSON(http.StatusInternalServerError, model.ErrorResponse{
				Error: model.ErrorDetail{Code: "internal", Message: "Gagal membuat order"},
			})
		}
		return
	}

	snapToken, err := h.midtrans.CreateSnapTransaction(midtransOrderID, order.Total)
	if err != nil {
		// Order & reservasi stok sudah dibuat di DB tapi Snap token gagal dibuat —
		// batalkan supaya tidak ada order "pending_payment" nyangkut tanpa cara bayar.
		if compErr := h.repo.CompensateFailedOrder(order.ID); compErr != nil {
			c.JSON(http.StatusInternalServerError, model.ErrorResponse{
				Error: model.ErrorDetail{Code: "internal", Message: "Gagal membuat transaksi pembayaran dan gagal membatalkan order"},
			})
			return
		}
		c.JSON(http.StatusBadGateway, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "payment_error", Message: "Gagal membuat transaksi pembayaran"},
		})
		return
	}

	res := model.CreateOrderResponse{
		Order:             ToOrderResponse(*order, orderItems),
		SnapToken:         snapToken,
		MidtransClientKey: h.midtrans.ClientKey(),
	}
	c.JSON(http.StatusCreated, model.Response{Data: res})
}

func (h *OrderHandler) ListOrders(c *gin.Context) {
	userID := c.GetString("user_id")

	orders, err := h.repo.ListByUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Gagal mengambil pesanan"},
		})
		return
	}

	res := make([]model.OrderResponse, 0, len(orders))
	for _, o := range orders {
		items, err := h.repo.GetItemsByOrderID(o.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, model.ErrorResponse{
				Error: model.ErrorDetail{Code: "internal", Message: "Gagal mengambil item pesanan"},
			})
			return
		}
		res = append(res, ToOrderResponse(o, items))
	}

	c.JSON(http.StatusOK, model.Response{Data: res})
}

func (h *OrderHandler) GetOrder(c *gin.Context) {
	userID := c.GetString("user_id")
	id := c.Param("id")

	order, err := h.repo.GetByIDForUser(id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Gagal mengambil pesanan"},
		})
		return
	}
	if order == nil {
		c.JSON(http.StatusNotFound, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "not_found", Message: "Pesanan tidak ditemukan"},
		})
		return
	}

	items, err := h.repo.GetItemsByOrderID(order.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Gagal mengambil item pesanan"},
		})
		return
	}

	c.JSON(http.StatusOK, model.Response{Data: ToOrderResponse(*order, items)})
}

// InternalOrderStatus dipakai chatbot n8n untuk cek status pesanan by order_id+email
// (header X-Internal-Key diverifikasi oleh middleware).
func (h *OrderHandler) InternalOrderStatus(c *gin.Context) {
	orderID := c.Query("order_id")
	email := c.Query("email")
	if orderID == "" || email == "" {
		c.JSON(http.StatusBadRequest, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "validation_error", Message: "order_id dan email wajib diisi"},
		})
		return
	}

	order, err := h.repo.GetForInternalStatus(orderID, email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Gagal mengambil status pesanan"},
		})
		return
	}
	if order == nil {
		c.JSON(http.StatusNotFound, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "not_found", Message: "Pesanan tidak ditemukan"},
		})
		return
	}

	c.JSON(http.StatusOK, model.Response{Data: model.InternalOrderStatusResponse{
		OrderID:   order.ID,
		Status:    order.Status,
		Total:     order.Total,
		CreatedAt: order.CreatedAt,
	}})
}

func ToOrderResponse(o repository.Order, items []repository.OrderItem) model.OrderResponse {
	var addr model.ShippingAddressResponse
	json.Unmarshal(o.ShippingAddress, &addr)

	itemsRes := make([]model.OrderItemResponse, 0, len(items))
	for _, it := range items {
		itemsRes = append(itemsRes, model.OrderItemResponse{
			Name:     it.Name,
			Color:    it.Color,
			Size:     it.Size,
			Qty:      it.Qty,
			Price:    it.Price,
			Subtotal: it.Subtotal,
		})
	}

	return model.OrderResponse{
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
