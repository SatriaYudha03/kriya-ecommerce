package promo

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type AdminHandler struct {
	repo *AdminRepository
}

func NewAdminHandler(repo *AdminRepository) *AdminHandler {
	return &AdminHandler{repo: repo}
}

// Stats mengembalikan metrik ringkas untuk dashboard admin.
func (h *AdminHandler) Stats(c *gin.Context) {
	totalOrders, revenue, activeProducts, err := h.repo.Stats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error: ErrorDetail{Code: "internal", Message: "Gagal mengambil statistik"},
		})
		return
	}
	c.JSON(http.StatusOK, Response{Data: AdminStatsResponse{
		TotalOrders:    totalOrders,
		Revenue:        revenue,
		ActiveProducts: activeProducts,
	}})
}
