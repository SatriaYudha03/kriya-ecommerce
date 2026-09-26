package promo

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/httpx"
)

type CouponHandler struct {
	repo *CouponRepository
}

func NewCouponHandler(repo *CouponRepository) *CouponHandler {
	return &CouponHandler{repo: repo}
}

func (h *CouponHandler) List(c *gin.Context) {
	page, limit := httpx.ParsePagination(c)
	filter := CouponFilter{
		Search: c.Query("search"),
		Status: c.Query("status"),
	}

	items, total, err := h.repo.List(c.Request.Context(), filter, page, limit)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal mengambil daftar kupon")
		return
	}

	if items == nil {
		items = []Coupon{}
	}

	c.JSON(http.StatusOK, httpx.Response{
		Data: items,
		Meta: &httpx.Meta{
			Page:  page,
			Limit: limit,
			Total: total,
		},
	})
}

func (h *CouponHandler) Detail(c *gin.Context) {
	id := c.Param("id")
	item, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal mengambil detail kupon")
		return
	}
	if item == nil {
		httpx.RespondError(c, http.StatusNotFound, "not_found", "Kupon tidak ditemukan")
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: item})
}

func (h *CouponHandler) Create(c *gin.Context) {
	var req CouponRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondError(c, http.StatusBadRequest, "bad_request", "Data tidak valid")
		return
	}

	userID, _ := httpx.UserID(c)

	item, err := h.repo.Create(c.Request.Context(), &req, userID)
	if err != nil {
		// should check if it's unique violation for code
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal membuat kupon")
		return
	}

	c.JSON(http.StatusCreated, httpx.Response{Data: item})
}

func (h *CouponHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req CouponRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondError(c, http.StatusBadRequest, "bad_request", "Data tidak valid")
		return
	}

	item, err := h.repo.Update(c.Request.Context(), id, &req)
	if err != nil {
		if err.Error() == "coupon not found" {
			httpx.RespondError(c, http.StatusNotFound, "not_found", "Kupon tidak ditemukan")
			return
		}
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal memperbarui kupon")
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: item})
}

func (h *CouponHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	err := h.repo.Delete(c.Request.Context(), id)
	if err != nil {
		if err.Error() == "coupon_in_use" {
			httpx.RespondError(c, http.StatusConflict, "conflict", "Kupon tidak dapat dihapus karena pernah dipakai")
			return
		}
		if err.Error() == "not_found" {
			httpx.RespondError(c, http.StatusNotFound, "not_found", "Kupon tidak ditemukan")
			return
		}
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal menghapus kupon")
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: map[string]string{"message": "Kupon dihapus"}})
}

func (h *CouponHandler) ListRedemptions(c *gin.Context) {
	id := c.Param("id")
	page, limit := httpx.ParsePagination(c)

	items, total, err := h.repo.ListRedemptions(c.Request.Context(), id, page, limit)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal mengambil daftar pemakaian")
		return
	}

	c.JSON(http.StatusOK, httpx.Response{
		Data: items,
		Meta: &httpx.Meta{
			Page:  page,
			Limit: limit,
			Total: total,
		},
	})
}
