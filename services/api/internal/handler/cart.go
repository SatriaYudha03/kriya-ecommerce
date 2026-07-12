package handler

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/model"
	"github.com/kriya-commerce/api/internal/repository"
	"github.com/kriya-commerce/api/internal/storage"
)

type CartHandler struct {
	repo        *repository.CartRepository
	supabaseURL string
}

func NewCartHandler(repo *repository.CartRepository, supabaseURL string) *CartHandler {
	return &CartHandler{repo: repo, supabaseURL: supabaseURL}
}

// rawCartItem adalah bentuk item persis seperti disimpan di kolom carts.items.
type rawCartItem struct {
	VariantID string `json:"variant_id"`
	Qty       int    `json:"qty"`
}

func (h *CartHandler) GetCart(c *gin.Context) {
	lang := resolveLocale(c)
	userID := c.GetString("user_id")

	cart, err := h.repo.GetByUserID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Gagal mengambil cart"},
		})
		return
	}

	var items []rawCartItem
	if cart != nil {
		json.Unmarshal(cart.Items, &items)
	}

	res, err := h.buildCartResponse(items, lang)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Gagal menghitung cart"},
		})
		return
	}

	c.JSON(http.StatusOK, model.Response{Data: res})
}

func (h *CartHandler) PutCart(c *gin.Context) {
	lang := resolveLocale(c)
	userID := c.GetString("user_id")

	var req model.PutCartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "validation_error", Message: "Body tidak valid"},
		})
		return
	}

	ids := make([]string, 0, len(req.Items))
	for _, it := range req.Items {
		ids = append(ids, it.VariantID)
	}

	variants, err := h.repo.GetVariantsByIDs(ids)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Gagal memvalidasi varian"},
		})
		return
	}
	found := make(map[string]bool, len(variants))
	for _, v := range variants {
		found[v.VariantID] = true
	}
	for _, it := range req.Items {
		if !found[it.VariantID] {
			c.JSON(http.StatusBadRequest, model.ErrorResponse{
				Error: model.ErrorDetail{Code: "validation_error", Message: "variant_id tidak ditemukan: " + it.VariantID},
			})
			return
		}
	}

	items := make([]rawCartItem, 0, len(req.Items))
	for _, it := range req.Items {
		items = append(items, rawCartItem{VariantID: it.VariantID, Qty: it.Qty})
	}
	itemsJSON, _ := json.Marshal(items)

	if err := h.repo.UpsertItems(userID, itemsJSON); err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Gagal menyimpan cart"},
		})
		return
	}

	res, err := h.buildCartResponse(items, lang)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Gagal menghitung cart"},
		})
		return
	}

	c.JSON(http.StatusOK, model.Response{Data: res})
}

// buildCartResponse menghitung ulang harga/subtotal/total dari data varian TERBARU di DB.
// Item yang variant_id-nya sudah tidak ada (mis. dihapus admin) di-skip diam-diam saat GET.
func (h *CartHandler) buildCartResponse(items []rawCartItem, locale string) (model.CartResponse, error) {
	ids := make([]string, 0, len(items))
	for _, it := range items {
		ids = append(ids, it.VariantID)
	}

	variants, err := h.repo.GetVariantsByIDs(ids)
	if err != nil {
		return model.CartResponse{}, err
	}
	byID := make(map[string]repository.VariantWithProduct, len(variants))
	for _, v := range variants {
		byID[v.VariantID] = v
	}

	res := model.CartResponse{Items: []model.CartItemResponse{}}
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
		res.Items = append(res.Items, model.CartItemResponse{
			VariantID: it.VariantID,
			Qty:       it.Qty,
			Price:     v.Price,
			Subtotal:  subtotal,
			Product: model.CartProductResponse{
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
