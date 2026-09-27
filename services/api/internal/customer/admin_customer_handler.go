package customer

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/httpx"
)

type AdminCustomerHandler struct {
	repo *AdminCustomerRepository
}

func NewAdminCustomerHandler(repo *AdminCustomerRepository) *AdminCustomerHandler {
	return &AdminCustomerHandler{repo: repo}
}

func (h *AdminCustomerHandler) GetCustomers(c *gin.Context) {
	q := c.Query("q")
	sort := c.Query("sort")
	if sort == "" {
		sort = "newest"
	}
	page, limit := httpx.ParsePagination(c)
	offset := (page - 1) * limit

	customers, total, err := h.repo.GetCustomers(q, sort, offset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{
		Data: customers,
		Meta: &httpx.Meta{
			Page:  page,
			Limit: limit,
			Total: total,
		},
	})
}

func (h *AdminCustomerHandler) GetCustomerDetail(c *gin.Context) {
	id := c.Param("id")
	detail, err := h.repo.GetCustomerDetail(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: detail})
}
