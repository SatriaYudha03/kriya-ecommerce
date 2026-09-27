package customer

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/httpx"
	"github.com/kriya-commerce/api/internal/storage"
)

type WishlistHandler struct {
	repo        *WishlistRepository
	supabaseURL string
}

func NewWishlistHandler(repo *WishlistRepository, supabaseURL string) *WishlistHandler {
	return &WishlistHandler{
		repo:        repo,
		supabaseURL: supabaseURL,
	}
}

func (h *WishlistHandler) GetWishlist(c *gin.Context) {
	userID := c.GetString("user_id")

	items, err := h.repo.GetWishlist(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal_error", Message: "Gagal mengambil wishlist"},
		})
		return
	}

	// Update thumbnail URLs
	for i := range items {
		if items[i].ThumbnailURL != "" {
			items[i].ThumbnailURL = storage.PublicImageURL(h.supabaseURL, items[i].ThumbnailURL)
		}
	}

	c.JSON(http.StatusOK, httpx.Response{
		Data: WishlistResponse{
			Items: items,
		},
	})
}

func (h *WishlistHandler) PutWishlist(c *gin.Context) {
	userID := c.GetString("user_id")

	var req WishlistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "validation_error", Message: "Body tidak valid"},
		})
		return
	}

	if err := h.repo.AddItem(userID, req.ProductID); err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal_error", Message: "Gagal menambah wishlist"},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{
		Data: WishlistActionResponse{Status: "ok"},
	})
}

func (h *WishlistHandler) DeleteWishlist(c *gin.Context) {
	userID := c.GetString("user_id")

	var req WishlistRequest
	// We can allow body for DELETE or use query string.
	// We'll support both for robustness. First check body, if empty, check query.
	if err := c.ShouldBindJSON(&req); err != nil {
		// Fallback to query
		req.ProductID = c.Query("product_id")
		if req.ProductID == "" {
			c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
				Error: httpx.ErrorDetail{Code: "validation_error", Message: "Body tidak valid / product_id hilang"},
			})
			return
		}
	}

	if err := h.repo.RemoveItem(userID, req.ProductID); err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal_error", Message: "Gagal menghapus wishlist"},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{
		Data: WishlistActionResponse{Status: "ok"},
	})
}
