package promo

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/checkout"
	"github.com/kriya-commerce/api/internal/httpx"
	"gorm.io/gorm"
)

type CouponHandler struct {
	repo            *CouponRepository
	discountApplier checkout.DiscountApplier
	db              *gorm.DB
}

func NewCouponHandler(repo *CouponRepository, discountApplier checkout.DiscountApplier, db *gorm.DB) *CouponHandler {
	return &CouponHandler{repo: repo, discountApplier: discountApplier, db: db}
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

type ValidateRequest struct {
	Code  string               `json:"code" binding:"required"`
	Lines []checkout.LineInput `json:"lines" binding:"required"`
}

func (h *CouponHandler) GetPublicCoupons(c *gin.Context) {
	items, err := h.repo.ListPublic(c.Request.Context())
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal mengambil kupon publik")
		return
	}
	if items == nil {
		items = []Coupon{}
	}
	c.JSON(http.StatusOK, httpx.Response{Data: items})
}

func (h *CouponHandler) ValidateCoupon(c *gin.Context) {
	var req ValidateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondError(c, http.StatusBadRequest, "bad_request", "Data tidak valid")
		return
	}

	locale := c.GetHeader("Accept-Language")
	if locale == "" {
		locale = "id"
	}
	
	// We run stateless Evaluate without DB lock
	pricedLines, problems, err := checkout.PriceLines(c.Request.Context(), h.db, req.Lines, locale, false)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal menghitung harga barang")
		return
	}
	
	if len(problems) > 0 {
		// As per standard, if there are problems, maybe just return them or let checkout handle it?
		// But validate is just checking if coupon is valid for what is available.
	}

	userID, _ := httpx.UserID(c) // Might be empty if unauthenticated, that is fine

	res, err := h.discountApplier.Evaluate(c.Request.Context(), h.db, userID, req.Code, pricedLines, locale, false)
	if err != nil {
		var rejectErr *checkout.CouponRejectedError
		if errors.As(err, &rejectErr) {
			httpx.RespondError(c, http.StatusBadRequest, string(rejectErr.Reason), rejectErr.Error())
			return
		}
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal validasi kupon")
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: res})
}

