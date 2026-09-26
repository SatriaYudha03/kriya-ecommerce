package aftersales

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/httpx"
	"gorm.io/gorm"
)

type ReviewHandler struct {
	repo *ReviewRepository
}

func NewReviewHandler(repo *ReviewRepository) *ReviewHandler {
	return &ReviewHandler{repo: repo}
}

func toReviewResponse(r ProductReview) ReviewResponse {
	return ReviewResponse{
		ID:          r.ID,
		ProductID:   r.ProductID,
		UserID:      r.UserID,
		OrderItemID: r.OrderItemID,
		Rating:      r.Rating,
		Title:       r.Title,
		Body:        r.Body,
		Status:      r.Status,
		AdminReply:  r.AdminReply,
		RepliedAt:   r.RepliedAt,
		CreatedAt:   r.CreatedAt,
		UpdatedAt:   r.UpdatedAt,
		UserName:    r.UserName,
		ProductName: r.ProductName,
		ProductSlug: r.ProductSlug,
		VariantName: r.VariantName,
	}
}

func (h *ReviewHandler) GetProductReviews(c *gin.Context) {
	slug := c.Param("slug")
	status := c.Query("status")
	if status == "" {
		status = "approved"
	}
	
	page, limit := httpx.ParsePagination(c)
	
	reviews, total, err := h.repo.GetReviewsByProductSlug(c.Request.Context(), slug, status, page, limit)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	
	res := make([]ReviewResponse, 0, len(reviews))
	for _, r := range reviews {
		res = append(res, toReviewResponse(r))
	}
	
	c.JSON(http.StatusOK, httpx.Response{
		Data: res,
		Meta: &httpx.Meta{Page: page, Limit: limit, Total: total},
	})
}

func (h *ReviewHandler) GetProductReviewSummary(c *gin.Context) {
	slug := c.Param("slug")
	
	avg, total, counts, err := h.repo.GetReviewSummary(c.Request.Context(), slug)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			httpx.RespondError(c, http.StatusNotFound, "product_not_found", "Product not found")
			return
		}
		httpx.RespondError(c, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	
	c.JSON(http.StatusOK, httpx.Response{
		Data: ReviewSummaryResponse{
			AverageRating: avg,
			TotalReviews:  total,
			RatingCounts:  counts,
		},
	})
}

func (h *ReviewHandler) GetMyReviews(c *gin.Context) {
	userID, _ := httpx.UserID(c)
	page, limit := httpx.ParsePagination(c)
	
	reviews, total, err := h.repo.GetReviewsByUser(c.Request.Context(), userID, page, limit)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	
	res := make([]ReviewResponse, 0, len(reviews))
	for _, r := range reviews {
		res = append(res, toReviewResponse(r))
	}
	
	c.JSON(http.StatusOK, httpx.Response{
		Data: res,
		Meta: &httpx.Meta{Page: page, Limit: limit, Total: total},
	})
}

func (h *ReviewHandler) GetMyReviewables(c *gin.Context) {
	userID, _ := httpx.UserID(c)
	page, limit := httpx.ParsePagination(c)
	
	items, total, err := h.repo.GetReviewablesByUser(c.Request.Context(), userID, page, limit)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	
	res := make([]OrderItemResponse, 0, len(items))
	for _, it := range items {
		regPrice := it.Price
		if it.RegularPrice != nil {
			regPrice = *it.RegularPrice
		}
		res = append(res, OrderItemResponse{
			ID:             it.ID,
			VariantID:      it.VariantID,
			ProductSlug:    ptrStr(it.ProductSlug),
			ThumbnailURL:   ptrStr(it.ThumbnailURL),
			Name:           it.Name,
			SKU:            it.SKU,
			Color:          it.Color,
			Size:           it.Size,
			Qty:            it.Qty,
			Price:          it.Price,
			RegularPrice:   regPrice,
			DiscountAmount: it.DiscountAmount,
			Subtotal:       it.Subtotal,
			RefundedQty:    it.RefundedQty,
			CanReview:      true,
			ReviewID:       nil,
		})
	}
	
	c.JSON(http.StatusOK, httpx.Response{
		Data: res,
		Meta: &httpx.Meta{Page: page, Limit: limit, Total: total},
	})
}

func (h *ReviewHandler) CreateReview(c *gin.Context) {
	userID, _ := httpx.UserID(c)
	
	var req CreateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	
	item, err := h.repo.GetOrderItemByIDAndUser(c.Request.Context(), req.OrderItemID, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			httpx.RespondError(c, http.StatusNotFound, "item_not_found", "Order item not eligible")
			return
		}
		httpx.RespondError(c, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	
	if item.ProductID == nil {
		httpx.RespondError(c, http.StatusBadRequest, "invalid_product", "Product no longer exists")
		return
	}
	
	review := ProductReview{
		ProductID:   *item.ProductID,
		UserID:      userID,
		OrderItemID: req.OrderItemID,
		Rating:      req.Rating,
		Title:       req.Title,
		Body:        req.Body,
		Status:      "pending",
	}
	
	err = h.repo.CreateReview(c.Request.Context(), &review)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	
	c.JSON(http.StatusCreated, httpx.Response{Data: toReviewResponse(review)})
}

func (h *ReviewHandler) UpdateReview(c *gin.Context) {
	userID, _ := httpx.UserID(c)
	id := c.Param("id")
	
	var req UpdateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	
	review, err := h.repo.GetReviewByIDAndUser(c.Request.Context(), id, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			httpx.RespondError(c, http.StatusNotFound, "review_not_found", "Review not found")
			return
		}
		httpx.RespondError(c, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	
	review.Rating = req.Rating
	review.Title = req.Title
	review.Body = req.Body
	review.Status = "pending"
	
	if err := h.repo.UpdateReview(c.Request.Context(), review); err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	
	c.JSON(http.StatusOK, httpx.Response{Data: toReviewResponse(*review)})
}

func (h *ReviewHandler) GetAdminReviews(c *gin.Context) {
	status := c.Query("status")
	page, limit := httpx.ParsePagination(c)
	
	reviews, total, err := h.repo.GetAdminReviews(c.Request.Context(), status, page, limit)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	
	res := make([]ReviewResponse, 0, len(reviews))
	for _, r := range reviews {
		res = append(res, toReviewResponse(r))
	}
	
	c.JSON(http.StatusOK, httpx.Response{
		Data: res,
		Meta: &httpx.Meta{Page: page, Limit: limit, Total: total},
	})
}

func (h *ReviewHandler) AdminUpdateReview(c *gin.Context) {
	id := c.Param("id")
	
	var req AdminUpdateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	
	review, err := h.repo.GetReviewByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			httpx.RespondError(c, http.StatusNotFound, "review_not_found", "Review not found")
			return
		}
		httpx.RespondError(c, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	
	if req.Status != "" {
		review.Status = req.Status
	}
	if req.AdminReply != nil {
		review.AdminReply = req.AdminReply
		now := time.Now()
		review.RepliedAt = &now
	}
	
	if err := h.repo.UpdateReview(c.Request.Context(), review); err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	
	c.JSON(http.StatusOK, httpx.Response{Data: toReviewResponse(*review)})
}
