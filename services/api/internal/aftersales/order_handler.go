package aftersales

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/httpx"
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

func (h *OrderHandler) ListOrders(c *gin.Context) {
	userID := c.GetString("user_id")

	orders, err := h.repo.ListByUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengambil pesanan"},
		})
		return
	}

	res := make([]OrderResponse, 0, len(orders))
	for _, o := range orders {
		items, err := h.repo.GetItemsByOrderID(o.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
				Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengambil item pesanan"},
			})
			return
		}
		res = append(res, ToOrderResponse(o, items))
	}

	c.JSON(http.StatusOK, httpx.Response{Data: res})
}

func (h *OrderHandler) GetOrder(c *gin.Context) {
	userID := c.GetString("user_id")
	id := c.Param("id")

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

	items, err := h.repo.GetItemsByOrderID(order.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengambil item pesanan"},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: ToOrderResponse(*order, items)})
}

// InternalOrderStatus dipakai chatbot n8n untuk cek status pesanan by order_id+email
// (header X-Internal-Key diverifikasi oleh middleware).
func (h *OrderHandler) InternalOrderStatus(c *gin.Context) {
	orderID := c.Query("order_id")
	email := c.Query("email")
	if orderID == "" || email == "" {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "validation_error", Message: "order_id dan email wajib diisi"},
		})
		return
	}

	order, err := h.repo.GetForInternalStatus(orderID, email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengambil status pesanan"},
		})
		return
	}
	if order == nil {
		c.JSON(http.StatusNotFound, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "not_found", Message: "Pesanan tidak ditemukan"},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: InternalOrderStatusResponse{
		OrderID:   order.ID,
		Status:    order.Status,
		Total:     order.Total,
		CreatedAt: order.CreatedAt,
	}})
}

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
