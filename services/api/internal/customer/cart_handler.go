package customer

import (
	"errors"
	"github.com/kriya-commerce/api/internal/httpx"

	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/storage"
)

type CartHandler struct {
	repo        *CartRepository
	supabaseURL string
}

func NewCartHandler(repo *CartRepository, supabaseURL string) *CartHandler {
	return &CartHandler{repo: repo, supabaseURL: supabaseURL}
}

func (h *CartHandler) GetCart(c *gin.Context) {
	lang := httpx.ResolveLocale(c)
	userID := c.GetString("user_id")

	items, err := h.repo.GetCartItems(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengambil cart"},
		})
		return
	}

	reqItems := make([]CartItemRequest, 0, len(items))
	for _, it := range items {
		reqItems = append(reqItems, CartItemRequest{VariantID: it.VariantID, Qty: it.Qty})
	}

	res, err := h.buildCartResponse(reqItems, lang)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal menghitung cart"},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: res})
}

func (h *CartHandler) PutCart(c *gin.Context) {
	lang := httpx.ResolveLocale(c)
	userID := c.GetString("user_id")

	var req PutCartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "validation_error", Message: "Body tidak valid"},
		})
		return
	}

	if err := h.validateItems(c, req.Items); err != nil {
		return
	}

	if err := h.repo.ReplaceItems(userID, req.Items); err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal menyimpan cart"},
		})
		return
	}

	res, err := h.buildCartResponse(req.Items, lang)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal menghitung cart"},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: res})
}

func (h *CartHandler) MergeCart(c *gin.Context) {
	lang := httpx.ResolveLocale(c)
	userID := c.GetString("user_id")

	var req PutCartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "validation_error", Message: "Body tidak valid"},
		})
		return
	}

	if err := h.validateItems(c, req.Items); err != nil {
		return
	}

	if err := h.repo.MergeItems(userID, req.Items); err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal menggabungkan cart"},
		})
		return
	}

	// Setelah merge, ambil kembali state terbaru dari DB
	items, err := h.repo.GetCartItems(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengambil cart terbaru"},
		})
		return
	}

	reqItems := make([]CartItemRequest, 0, len(items))
	for _, it := range items {
		reqItems = append(reqItems, CartItemRequest{VariantID: it.VariantID, Qty: it.Qty})
	}

	res, err := h.buildCartResponse(reqItems, lang)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal menghitung cart"},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: res})
}

func (h *CartHandler) validateItems(c *gin.Context, items []CartItemRequest) error {
	ids := make([]string, 0, len(items))
	for _, it := range items {
		ids = append(ids, it.VariantID)
	}

	variants, err := h.repo.GetVariantsByIDs(ids)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal memvalidasi varian"},
		})
		return err
	}
	found := make(map[string]bool, len(variants))
	for _, v := range variants {
		found[v.VariantID] = true
	}
	for _, it := range items {
		if !found[it.VariantID] {
			c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
				Error: httpx.ErrorDetail{Code: "validation_error", Message: "variant_id tidak ditemukan: " + it.VariantID},
			})
			return errors.New("variant_id tidak ditemukan")
		}
	}
	return nil
}

// buildCartResponse menghitung ulang harga/subtotal/total dari data varian TERBARU di DB.
// Item yang variant_id-nya sudah tidak ada (mis. dihapus admin) di-skip diam-diam saat GET.
func (h *CartHandler) buildCartResponse(items []CartItemRequest, locale string) (CartResponse, error) {
	ids := make([]string, 0, len(items))
	for _, it := range items {
		ids = append(ids, it.VariantID)
	}

	variants, err := h.repo.GetVariantsByIDs(ids)
	if err != nil {
		return CartResponse{}, err
	}
	byID := make(map[string]VariantWithProduct, len(variants))
	for _, v := range variants {
		byID[v.VariantID] = v
	}

	res := CartResponse{Items: []CartItemResponse{}}
	total := 0
	for _, it := range items {
		v, ok := byID[it.VariantID]
		if !ok {
			continue
		}
		subtotal := v.Price * it.Qty
		total += subtotal
		var size *string
		if v.Size != nil {
			s := getI18nString(v.SizeI18n, locale, *v.Size)
			size = &s
		}
		res.Items = append(res.Items, CartItemResponse{
			VariantID: it.VariantID,
			Qty:       it.Qty,
			Price:     v.Price,
			Stock:     v.Stock,
			Subtotal:  subtotal,
			Product: CartProductResponse{
				Slug:         v.ProductSlug,
				Name:         getI18nString(v.NameI18n, locale, v.ProductName),
				ThumbnailURL: storage.PublicImageURL(h.supabaseURL, v.ThumbnailPath),
				Color:        getI18nString(v.ColorI18n, locale, v.Color),
				Size:         size,
			},
		})
	}
	res.Total = total
	return res, nil
}
