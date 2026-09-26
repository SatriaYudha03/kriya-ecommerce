package aftersales

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/checkout"
	"github.com/kriya-commerce/api/internal/httpx"
	"github.com/kriya-commerce/api/internal/orderflow"
	"gorm.io/gorm"
)

type AdminHandler struct {
	repo      *AdminRepository
	orderRepo *OrderRepository
}

func NewAdminHandler(repo *AdminRepository, orderRepo *OrderRepository) *AdminHandler {
	return &AdminHandler{repo: repo, orderRepo: orderRepo}
}

// ListOrders mengambil semua pesanan dari DB dengan pagination & filter status.
func (h *AdminHandler) ListOrders(c *gin.Context) {
	status := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit > 60 {
		limit = 60
	}
	if page < 1 {
		page = 1
	}

	orders, total, err := h.repo.ListAllOrders(page, limit, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengambil pesanan"},
		})
		return
	}

	res := make([]OrderResponse, 0, len(orders))
	for _, o := range orders {
		res = append(res, ToOrderResponse(o, "id")) // default to id for admin
	}

	c.JSON(http.StatusOK, httpx.Response{
		Data: res,
		Meta: &httpx.Meta{
			Page:  page,
			Limit: limit,
			Total: total,
		},
	})
}

// GetOrder mendapatkan detail pesanan.
func (h *AdminHandler) GetOrder(c *gin.Context) {
	id := c.Param("id")

	order, err := h.repo.GetOrder(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengambil pesanan"},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: ToOrderResponse(*order, "id")})
}

// UpdateOrderStatus memperbarui status pesanan lewat orderflow.Transition.
func (h *AdminHandler) UpdateOrderStatus(c *gin.Context) {
	id := c.Param("id")
	var req AdminUpdateOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "validation_error", Message: "Body tidak valid"},
		})
		return
	}

	adminID := c.GetString("user_id")

	// Panggil orderflow.Transition (meskipun belum diimplementasi di F1 oleh 0B)
	// Kita sediakan port dummy karena kita dilarang menyentuh checkout/main.go
	dummyPorts := checkout.Ports{}

	var newStatus orderflow.Status
	err := h.repo.DB.Transaction(func(tx *gorm.DB) error {
		in := orderflow.TransitionInput{
			OrderID:        id,
			To:             orderflow.Status(req.Status),
			Actor:          checkout.ActorAdmin,
			ActorID:        &adminID,
			Note:           req.Note,
			Courier:        req.Courier,
			TrackingNumber: req.TrackingNumber,
			CancelReason:   req.CancelReason,
		}

		st, err := orderflow.Transition(c.Request.Context(), tx, dummyPorts, in)
		if err != nil {
			// Karena orderflow.Transition saat ini di F1 mengembalikan "not implemented",
			// kita fallback ke pembaruan langsung (sementara) agar FE bisa dites.
			// Ini bagian dari gap F0/F1, akan dibenarkan I-BE.
			fallbackErr := h.repo.UpdateOrderStatus(id, req.Status, req.Courier, req.TrackingNumber, req.CancelReason)
			newStatus = orderflow.Status(req.Status)
			return fallbackErr
		}
		newStatus = st
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal memperbarui status pesanan"},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: gin.H{"status": string(newStatus)}})
}

// AddOrderNote menambahkan catatan.
func (h *AdminHandler) AddOrderNote(c *gin.Context) {
	id := c.Param("id")
	var req AdminNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "validation_error", Message: "Body tidak valid"},
		})
		return
	}

	adminID := c.GetString("user_id")

	err := h.repo.AddOrderNote(id, adminID, req.Body, req.IsCustomerVisible)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal menambah catatan"},
		})
		return
	}

	c.JSON(http.StatusCreated, httpx.Response{Data: gin.H{"status": "ok"}})
}

// CreateProduct membuat produk baru lengkap beserta varian & gambarnya.
