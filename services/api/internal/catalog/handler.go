package catalog

import (
	"github.com/kriya-commerce/api/internal/httpx"

	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/storage"
)

func getI18nArray(data []byte, locale string, fallback []byte) []byte {
	if len(data) == 0 || string(data) == "{}" {
		return fallback
	}
	var m map[string]json.RawMessage
	if err := json.Unmarshal(data, &m); err == nil {
		if val, ok := m[locale]; ok && len(val) > 0 {
			return val
		}
		if val, ok := m["id"]; ok && len(val) > 0 {
			return val
		}
		if val, ok := m["en"]; ok && len(val) > 0 {
			return val
		}
	}
	return fallback
}

type CatalogHandler struct {
	repo        *CatalogRepository
	supabaseURL string
}

func NewCatalogHandler(repo *CatalogRepository, supabaseURL string) *CatalogHandler {
	return &CatalogHandler{repo: repo, supabaseURL: supabaseURL}
}

func isVariantOnSale(v ProductVariant) bool {
	if v.SalePrice == nil || *v.SalePrice >= v.Price || *v.SalePrice <= 0 {
		return false
	}
	now := time.Now()
	if v.SaleStartsAt != nil && now.Before(*v.SaleStartsAt) {
		return false
	}
	if v.SaleEndsAt != nil && now.After(*v.SaleEndsAt) {
		return false
	}
	return true
}

func getEffectivePrice(v ProductVariant) int {
	if isVariantOnSale(v) {
		return *v.SalePrice
	}
	return v.Price
}

func (h *CatalogHandler) GetCategories(c *gin.Context) {
	lang := httpx.ResolveLocale(c)
	categories, err := h.repo.GetCategories()
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Failed to fetch categories"},
		})
		return
	}

	var res []CategoryResponse
	for _, cat := range categories {
		imgUrl := ""
		if cat.ImagePath != nil && *cat.ImagePath != "" {
			imgUrl = storage.PublicImageURL(h.supabaseURL, *cat.ImagePath)
		}
		res = append(res, CategoryResponse{
			ID:          cat.ID,
			Slug:        cat.Slug,
			Name:        getI18nString(cat.NameI18n, lang, cat.Name),
			ParentID:    cat.ParentID,
			Description: getI18nString(cat.DescriptionI18n, lang, ""),
			ImageURL:    imgUrl,
			Position:    cat.Position,
		})
	}

	c.JSON(http.StatusOK, httpx.Response{Data: res})
}

func (h *CatalogHandler) GetProducts(c *gin.Context) {
	lang := httpx.ResolveLocale(c)
	category := c.Query("category")
	q := c.Query("q")
	sort := c.Query("sort")

	minPrice, _ := strconv.Atoi(c.Query("min_price"))
	maxPrice, _ := strconv.Atoi(c.Query("max_price"))
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	onSale, _ := strconv.ParseBool(c.Query("on_sale"))
	inStock, _ := strconv.ParseBool(c.Query("in_stock"))
	featured, _ := strconv.ParseBool(c.Query("featured"))
	tags := c.Query("tags")
	attrs := c.Query("attrs")

	if limit == 0 {
		limit = 24
	}
	if page < 1 {
		page = 1
	}

	products, total, err := h.repo.GetProducts(category, q, tags, attrs, sort, minPrice, maxPrice, onSale, inStock, featured, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Failed to fetch products"},
		})
		return
	}

	var res []ProductListResponse
	for _, p := range products {
		var minP int
		var minRegP int
		var onSale bool
		var totalStock int
		
		if len(p.Variants) > 0 {
			minP = getEffectivePrice(p.Variants[0])
			minRegP = p.Variants[0].Price
			if isVariantOnSale(p.Variants[0]) {
				onSale = true
			}
			
			for _, v := range p.Variants {
				totalStock += v.Stock
				eff := getEffectivePrice(v)
				if eff < minP {
					minP = eff
					minRegP = v.Price
				}
				if isVariantOnSale(v) {
					onSale = true
				}
			}
		}

		thumb := ""
		if len(p.Images) > 0 {
			thumb = storage.PublicImageURL(h.supabaseURL, p.Images[0].StoragePath)
		}

		item := ProductListResponse{
			ID:           p.ID,
			Slug:         p.Slug,
			Name:         getI18nString(p.NameI18n, lang, p.Name),
			CategorySlug: p.CategorySlug,
			PriceMin:     minP,
			OnSale:       onSale,
			ThumbnailURL: thumb,
			Status:       p.Status,
			IsFeatured:   p.IsFeatured,
			RatingAvg:    p.RatingAvg,
			RatingCount:  p.RatingCount,
			InStock:      totalStock > 0,
		}
		
		if onSale {
			item.RegularPriceMin = minRegP
		}

		res = append(res, item)
	}

	if res == nil {
		res = []ProductListResponse{} // return empty array instead of null
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

func (h *CatalogHandler) GetProduct(c *gin.Context) {
	lang := httpx.ResolveLocale(c)
	slug := c.Param("slug")
	p, err := h.repo.GetProductBySlug(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "not_found", Message: "Product not found"},
		})
		return
	}

	var materials []string
	materialsData := getI18nArray(p.MaterialsI18n, lang, p.Materials)
	if len(materialsData) > 0 {
		json.Unmarshal(materialsData, &materials)
	}

	var dims Dimensions
	if len(p.Dimensions) > 0 {
		json.Unmarshal(p.Dimensions, &dims)
	}

	var images []ImageResponse
	for _, img := range p.Images {
		images = append(images, ImageResponse{
			URL: storage.PublicImageURL(h.supabaseURL, img.StoragePath),
			Alt: getI18nString(img.AltI18n, lang, img.Alt),
		})
	}

	var variants []VariantResponse
	var minP int
	var minRegP int
	var onSale bool
	var saleEndsAt *time.Time
	
	if len(p.Variants) > 0 {
		minP = getEffectivePrice(p.Variants[0])
		minRegP = p.Variants[0].Price
	}

	for _, v := range p.Variants {
		var size *string
		if v.Size != nil {
			s := getI18nString(v.SizeI18n, lang, *v.Size)
			size = &s
		}
		
		effPrice := getEffectivePrice(v)
		vOnSale := isVariantOnSale(v)
		
		if effPrice < minP {
			minP = effPrice
			minRegP = v.Price
		}
		
		var saleEnds *time.Time
		var regPrice int
		if vOnSale {
			onSale = true
			saleEnds = v.SaleEndsAt
			if saleEndsAt == nil || (saleEnds != nil && saleEnds.After(*saleEndsAt)) {
				saleEndsAt = saleEnds
			}
			regPrice = v.Price
		}

		variants = append(variants, VariantResponse{
			ID:           v.ID,
			Sku:          v.Sku,
			Color:        getI18nString(v.ColorI18n, lang, v.Color),
			Size:         size,
			Price:        effPrice,
			RegularPrice: regPrice,
			SaleEndsAt:   saleEnds,
			Stock:        v.Stock,
		})
	}

	var catParent *CategoryRef
	if p.Category.Parent != nil {
		catParent = &CategoryRef{
			Slug: p.Category.Parent.Slug,
			Name: getI18nString(p.Category.Parent.NameI18n, lang, p.Category.Parent.Name),
		}
	}
	
	var tags []TagResponse
	for _, t := range p.Tags {
		tags = append(tags, TagResponse{
			Slug: t.Slug,
			Name: getI18nString(t.NameI18n, lang, ""),
		})
	}
	if tags == nil {
		tags = []TagResponse{}
	}

	attrMap := make(map[string]*AttributeResponse)
	for _, term := range p.AttributeTerms {
		attrSlug := term.Attribute.Slug
		if _, exists := attrMap[attrSlug]; !exists {
			attrMap[attrSlug] = &AttributeResponse{
				Slug:  attrSlug,
				Name:  getI18nString(term.Attribute.NameI18n, lang, ""),
				Terms: []AttributeTermResponse{},
			}
		}
		attrMap[attrSlug].Terms = append(attrMap[attrSlug].Terms, AttributeTermResponse{
			Slug: term.Slug,
			Name: getI18nString(term.NameI18n, lang, ""),
		})
	}
	var attrs []AttributeResponse
	for _, a := range attrMap {
		attrs = append(attrs, *a)
	}
	if attrs == nil {
		attrs = []AttributeResponse{}
	}

	// For attributes, we need to group terms by attribute
	// We don't have the attribute preloaded yet, so we should preload Attribute inside AttributeTerms
	// Let's modify GetProductBySlug in repository to Preload("AttributeTerms.Attribute")
	
	res := ProductDetailResponse{
		ID:          p.ID,
		Slug:        p.Slug,
		Name:        getI18nString(p.NameI18n, lang, p.Name),
		Description: getI18nString(p.DescriptionI18n, lang, p.Description),
		ShortDescription: getI18nString(p.ShortDescriptionI18n, lang, ""),
		Category: CategoryRef{
			Slug: p.Category.Slug,
			Name: getI18nString(p.Category.NameI18n, lang, p.Category.Name),
			Parent: catParent,
		},
		Tags:             tags,
		Attributes:       attrs,
		Materials:        materials,
		Dimensions:       dims,
		WeightKg:         p.WeightKg,
		Images:           images,
		Variants:         variants,
		HasAssemblyGuide: p.HasAssemblyGuide,
		PriceMin:         minP,
		OnSale:           onSale,
		SaleEndsAt:       saleEndsAt,
		RatingAvg:        p.RatingAvg,
		RatingCount:      p.RatingCount,
	}
	
	if onSale {
		res.RegularPriceMin = minRegP
	}

	c.JSON(http.StatusOK, httpx.Response{Data: res})
}
func (h *CatalogHandler) GetTags(c *gin.Context) {
	lang := httpx.ResolveLocale(c)
	tags, err := h.repo.GetTags()
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{Error: httpx.ErrorDetail{Code: "internal", Message: err.Error()}})
		return
	}

	var res []TagResponse
	for _, t := range tags {
		res = append(res, TagResponse{
			Slug: t.Slug,
			Name: getI18nString(t.NameI18n, lang, ""),
		})
	}
	if res == nil {
		res = []TagResponse{}
	}
	c.JSON(http.StatusOK, httpx.Response{Data: res})
}

func (h *CatalogHandler) GetAttributes(c *gin.Context) {
	lang := httpx.ResolveLocale(c)
	cat := c.Query("category")
	
	attrs, err := h.repo.GetAttributes(cat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{Error: httpx.ErrorDetail{Code: "internal", Message: err.Error()}})
		return
	}
	
	counts, _ := h.repo.GetProductCountsForTerms(cat)

	var res []AttributeResponse
	for _, a := range attrs {
		var terms []AttributeTermResponse
		for _, t := range a.Terms {
			count := counts[t.ID]
			if count > 0 { // Only terms with product_count > 0
				terms = append(terms, AttributeTermResponse{
					Slug:         t.Slug,
					Name:         getI18nString(t.NameI18n, lang, ""),
					ProductCount: count,
				})
			}
		}
		if len(terms) > 0 {
			res = append(res, AttributeResponse{
				Slug:  a.Slug,
				Name:  getI18nString(a.NameI18n, lang, ""),
				Terms: terms,
			})
		}
	}
	if res == nil {
		res = []AttributeResponse{}
	}
	c.JSON(http.StatusOK, httpx.Response{Data: res})
}
