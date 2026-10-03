package customer

import (
	"errors"
	"github.com/kriya-commerce/api/internal/httpx"
	"strconv"
	"sync"

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

	variants, err := h.repo.GetVariantsByIDs(variantIDs(reqItems))
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal menghitung cart"},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: h.buildCartResponse(reqItems, variants, lang)})
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

	variants, err := h.validateItems(c, userID, req.Items, true)
	if err != nil {
		return
	}

	if err := h.repo.ReplaceItems(userID, req.Items); err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal menyimpan cart"},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: h.buildCartResponse(req.Items, variants, lang)})
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

	if _, err := h.validateItems(c, userID, req.Items, false); err != nil {
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

	variants, err := h.repo.GetVariantsByIDs(variantIDs(reqItems))
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal menghitung cart"},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: h.buildCartResponse(reqItems, variants, lang)})
}

func variantIDs(items []CartItemRequest) []string {
	ids := make([]string, 0, len(items))
	for _, it := range items {
		ids = append(ids, it.VariantID)
	}
	return ids
}

// validateItems memastikan semua variant_id ada dan mengembalikan datanya, supaya
// buildCartResponse tidak perlu query ulang. Jika checkStock, kenaikan qty melebihi stok
// ditolak (409 insufficient_stock). Hanya KENAIKAN yang ditolak: item lama yang stoknya
// sudah menyusut tidak boleh memblokir pengguna mengubah/menghapus item lain.
func (h *CartHandler) validateItems(c *gin.Context, userID string, items []CartItemRequest, checkStock bool) ([]VariantWithProduct, error) {
	var (
		variants []VariantWithProduct
		current  []CartItem
		varErr   error
		curErr   error
		wg       sync.WaitGroup
	)
	wg.Add(1)
	go func() {
		defer wg.Done()
		variants, varErr = h.repo.GetVariantsByIDs(variantIDs(items))
	}()
	if checkStock {
		wg.Add(1)
		go func() {
			defer wg.Done()
			current, curErr = h.repo.GetCartItems(userID)
		}()
	}
	wg.Wait()

	if varErr != nil || curErr != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal memvalidasi varian"},
		})
		return nil, errors.New("gagal memvalidasi varian")
	}

	byID := make(map[string]VariantWithProduct, len(variants))
	for _, v := range variants {
		byID[v.VariantID] = v
	}
	prevQty := make(map[string]int, len(current))
	for _, ci := range current {
		prevQty[ci.VariantID] = ci.Qty
	}
	for _, it := range items {
		v, ok := byID[it.VariantID]
		if !ok {
			c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
				Error: httpx.ErrorDetail{Code: "validation_error", Message: "variant_id tidak ditemukan: " + it.VariantID},
			})
			return nil, errors.New("variant_id tidak ditemukan")
		}
		if checkStock && it.Qty > prevQty[it.VariantID] && it.Qty > v.Stock {
			c.JSON(http.StatusConflict, httpx.ErrorResponse{
				Error: httpx.ErrorDetail{Code: "insufficient_stock", Message: "Stok tidak cukup untuk " + v.ProductName + ", tersedia " + strconv.Itoa(v.Stock)},
			})
			return nil, errors.New("stok tidak cukup")
		}
	}
	return variants, nil
}

// buildCartResponse menghitung ulang harga/subtotal/total dari data varian TERBARU di DB.
// Item yang variant_id-nya sudah tidak ada (mis. dihapus admin) di-skip diam-diam saat GET.
func (h *CartHandler) buildCartResponse(items []CartItemRequest, variants []VariantWithProduct, locale string) CartResponse {
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
	return res
}
