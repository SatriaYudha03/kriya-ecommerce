package aftersales

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/httpx"
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
		items, err := h.orderRepo.GetItemsByOrderID(o.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
				Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengambil item pesanan"},
			})
			return
		}
		res = append(res, ToOrderResponse(o, items))
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

// UpdateOrderStatus memperbarui status pesanan.
func (h *AdminHandler) UpdateOrderStatus(c *gin.Context) {
	id := c.Param("id")
	var req AdminUpdateOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "validation_error", Message: "Status tidak valid"},
		})
		return
	}

	err := h.repo.UpdateOrderStatus(id, req.Status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal memperbarui status pesanan"},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: gin.H{"status": req.Status}})
}

// CreateProduct membuat produk baru lengkap beserta varian & gambarnya.
