package catalog

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kriya-commerce/api/internal/httpx"
	"github.com/kriya-commerce/api/internal/storage"
)

type AdminHandler struct {
	repo *AdminRepository

	supabaseURL string
}

func NewAdminHandler(repo *AdminRepository, supabaseURL string) *AdminHandler {
	return &AdminHandler{repo: repo, supabaseURL: supabaseURL}
}

// ListOrders mengambil semua pesanan dari DB dengan pagination & filter status.

// ListProducts mengambil semua produk dari DB dengan pagination & filter.
func (h *AdminHandler) ListProducts(c *gin.Context) {
	q := c.Query("q")
	status := c.Query("status")
	page, limit := httpx.ParsePagination(c)

	products, total, err := h.repo.GetAdminProducts(q, status, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengambil daftar produk"},
		})
		return
	}

	var data []ProductListResponse
	for _, p := range products {
		priceMin := 0
		if len(p.Variants) > 0 {
			priceMin = p.Variants[0].Price
			for _, v := range p.Variants {
				if v.Price < priceMin {
					priceMin = v.Price
				}
			}
		}

		thumbnailURL := ""
		if len(p.Images) > 0 {
			thumbnailURL = storage.PublicImageURL(h.supabaseURL, p.Images[0].StoragePath)
		}

		data = append(data, ProductListResponse{
			ID:           p.ID,
			Slug:         p.Slug,
			Name:         p.Name,
			CategorySlug: p.CategorySlug,
			PriceMin:     priceMin,
			ThumbnailURL: thumbnailURL,
			Status:       p.Status,
		})
	}

	c.JSON(http.StatusOK, httpx.Response{
		Data: data,
		Meta: &httpx.Meta{Page: page, Limit: limit, Total: total},
	})
}

func (h *AdminHandler) ListCategories(c *gin.Context) {
	categories, err := h.repo.GetCategories()
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengambil daftar kategori"},
		})
		return
	}

	var data []AdminCategoryResponse
	for _, cat := range categories {
		data = append(data, AdminCategoryResponse{
			ID:              cat.ID,
			Slug:            cat.Slug,
			Name:            cat.Name,
			ParentID:        cat.ParentID,
			DescriptionI18n: cat.DescriptionI18n,
			ImagePath:       cat.ImagePath,
			Position:        cat.Position,
			IsActive:        cat.IsActive,
		})
	}

	c.JSON(http.StatusOK, httpx.Response{Data: data})
}

func (h *AdminHandler) GetCategory(c *gin.Context) {
	id := c.Param("id")
	cat, err := h.repo.GetCategory(id)
	if err != nil {
		c.JSON(http.StatusNotFound, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "not_found", Message: "Kategori tidak ditemukan"},
		})
		return
	}
	c.JSON(http.StatusOK, httpx.Response{Data: AdminCategoryResponse{
		ID:              cat.ID,
		Slug:            cat.Slug,
		Name:            cat.Name,
		ParentID:        cat.ParentID,
		DescriptionI18n: cat.DescriptionI18n,
		ImagePath:       cat.ImagePath,
		Position:        cat.Position,
		IsActive:        cat.IsActive,
	}})
}

func (h *AdminHandler) CreateCategory(c *gin.Context) {
	var req AdminCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "validation_error", Message: err.Error()},
		})
		return
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	cat := Category{
		ID:              uuid.New().String(),
		Slug:            req.Slug,
		Name:            req.Name,
		ParentID:        req.ParentID,
		DescriptionI18n: req.DescriptionI18n,
		ImagePath:       req.ImagePath,
		Position:        req.Position,
		IsActive:        isActive,
	}

	if err := h.repo.CreateCategory(&cat); err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal membuat kategori"},
		})
		return
	}
	c.JSON(http.StatusCreated, httpx.Response{Data: gin.H{"id": cat.ID}})
}

func (h *AdminHandler) UpdateCategory(c *gin.Context) {
	id := c.Param("id")
	var req AdminCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "validation_error", Message: err.Error()},
		})
		return
	}

	updates := map[string]interface{}{
		"slug":             req.Slug,
		"name":             req.Name,
		"parent_id":        req.ParentID,
		"description_i18n": req.DescriptionI18n,
		"image_path":       req.ImagePath,
		"position":         req.Position,
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if err := h.repo.UpdateCategory(id, updates); err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal memperbarui kategori"},
		})
		return
	}
	c.JSON(http.StatusOK, httpx.Response{Data: gin.H{"id": id}})
}

func (h *AdminHandler) DeleteCategory(c *gin.Context) {
	id := c.Param("id")
	if err := h.repo.DeleteCategory(id); err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal menghapus kategori"},
		})
		return
	}
	c.JSON(http.StatusOK, httpx.Response{Data: gin.H{"id": id}})
}

// CreateProduct membuat produk baru lengkap beserta varian & gambarnya.
func (h *AdminHandler) CreateProduct(c *gin.Context) {
	var req AdminCreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "validation_error", Message: err.Error()},
		})
		return
	}

	materialsJSON, _ := json.Marshal(req.Materials)
	dimsJSON, _ := json.Marshal(req.Dimensions)

	productID := uuid.New().String()

	variants := make([]ProductVariant, len(req.Variants))
	for i, v := range req.Variants {
		variants[i] = ProductVariant{
			ID:           uuid.New().String(),
			ProductID:    productID,
			Sku:          v.Sku,
			Color:        v.Color,
			Size:         v.Size,
			Price:        v.Price,
			SalePrice:    v.SalePrice,
			SaleStartsAt: v.SaleStartsAt,
			SaleEndsAt:   v.SaleEndsAt,
			Stock:        v.Stock,
		}
		if v.IsActive != nil {
			variants[i].IsActive = *v.IsActive
		} else {
			variants[i].IsActive = true
		}
	}

	images := make([]ProductImage, len(req.Images))
	for i, img := range req.Images {
		images[i] = ProductImage{
			ID:          uuid.New().String(),
			ProductID:   productID,
			StoragePath: img.StoragePath,
			Alt:         img.Alt,
			IsPrimary:   img.IsPrimary,
		}
	}

	if req.Status == "" {
		req.Status = "published"
	}
	var seoMetadata []byte = []byte("{}")
	if len(req.SeoMetadata) > 0 {
		seoMetadata = req.SeoMetadata
	}
	var summaryI18n []byte = []byte("{}")
	if req.Summary != "" {
		// simplifikasi menyimpan summary ke jsonb format en/id
		sumMap := map[string]string{"id": req.Summary, "en": req.Summary}
		summaryI18n, _ = json.Marshal(sumMap)
	}

	p := Product{
		ID:                   productID,
		Slug:                 req.Slug,
		Name:                 req.Name,
		CategorySlug:         req.CategorySlug,
		Description:          req.Description,
		Materials:            materialsJSON,
		Dimensions:           dimsJSON,
		WeightKg:             req.WeightKg,
		HasAssemblyGuide:     req.HasAssemblyGuide,
		Status:               req.Status,
		IsFeatured:           req.Featured,
		ShortDescriptionI18n: summaryI18n,
		MetaTitleI18n:        seoMetadata, // simplifying seo storing for now
		Variants:             variants,
		Images:               images,
	}

	if err := h.repo.CreateProduct(&p); err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal membuat produk"},
		})
		return
	}

	c.JSON(http.StatusCreated, httpx.Response{Data: gin.H{"id": productID}})
}

// UpdateProduct memperbarui properti produk (tidak termasuk varian & gambar).
func (h *AdminHandler) UpdateProduct(c *gin.Context) {
	id := c.Param("id")
	var req AdminUpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "validation_error", Message: err.Error()},
		})
		return
	}

	updates := make(map[string]interface{})
	if req.Slug != "" {
		updates["slug"] = req.Slug
	}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.CategorySlug != "" {
		updates["category_slug"] = req.CategorySlug
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Materials != nil {
		materialsJSON, _ := json.Marshal(req.Materials)
		updates["materials"] = materialsJSON
	}
	dimsJSON, _ := json.Marshal(req.Dimensions)
	updates["dimensions"] = dimsJSON
	updates["weight_kg"] = req.WeightKg
	updates["has_assembly_guide"] = req.HasAssemblyGuide

	if req.Status != "" {
		updates["status"] = req.Status
	}
	updates["is_featured"] = req.Featured
	if req.Summary != "" {
		sumMap := map[string]string{"id": req.Summary, "en": req.Summary}
		summaryI18n, _ := json.Marshal(sumMap)
		updates["short_description_i18n"] = summaryI18n
	}
	if len(req.SeoMetadata) > 0 {
		updates["meta_title_i18n"] = req.SeoMetadata
	}

	if err := h.repo.UpdateProduct(id, updates); err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal memperbarui produk"},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: gin.H{"id": id}})
}

// DeleteProduct menghapus produk beserta relasinya.
func (h *AdminHandler) DeleteProduct(c *gin.Context) {
	id := c.Param("id")
	if err := h.repo.DeleteProduct(id); err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal menghapus produk"},
		})
		return
	}
	c.JSON(http.StatusOK, httpx.Response{Data: gin.H{"id": id}})
}

// CreateVariant menambahkan varian baru untuk suatu produk.
func (h *AdminHandler) CreateVariant(c *gin.Context) {
	productID := c.Param("id")
	var req AdminVariantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "validation_error", Message: err.Error()},
		})
		return
	}

	v := ProductVariant{
		ID:           uuid.New().String(),
		ProductID:    productID,
		Sku:          req.Sku,
		Color:        req.Color,
		Size:         req.Size,
		Price:        req.Price,
		SalePrice:    req.SalePrice,
		SaleStartsAt: req.SaleStartsAt,
		SaleEndsAt:   req.SaleEndsAt,
		Stock:        req.Stock,
	}
	if req.IsActive != nil {
		v.IsActive = *req.IsActive
	} else {
		v.IsActive = true
	}

	if err := h.repo.CreateVariant(&v); err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal membuat varian"},
		})
		return
	}

	c.JSON(http.StatusCreated, httpx.Response{Data: v})
}

// UpdateVariant memperbarui properti suatu varian (termasuk harga & stok).
func (h *AdminHandler) UpdateVariant(c *gin.Context) {
	variantID := c.Param("variant_id")
	var req AdminVariantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "validation_error", Message: err.Error()},
		})
		return
	}

	updates := map[string]interface{}{
		"sku":            req.Sku,
		"color":          req.Color,
		"size":           req.Size,
		"price":          req.Price,
		"sale_price":     req.SalePrice,
		"sale_starts_at": req.SaleStartsAt,
		"sale_ends_at":   req.SaleEndsAt,
		"stock":          req.Stock,
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if err := h.repo.UpdateVariant(variantID, updates); err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal memperbarui varian"},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: gin.H{"id": variantID}})
}

// DeleteVariant menghapus varian.
func (h *AdminHandler) DeleteVariant(c *gin.Context) {
	variantID := c.Param("variant_id")
	if err := h.repo.DeleteVariant(variantID); err != nil {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "validation_error", Message: err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, httpx.Response{Data: gin.H{"id": variantID}})
}

// Stats mengembalikan metrik ringkas untuk dashboard admin.

// GetProduct mengembalikan detail produk bentuk internal (id varian & gambar,
// is_primary, storage_path) untuk prefill form edit admin.
func (h *AdminHandler) GetProduct(c *gin.Context) {
	id := c.Param("id")
	p, err := h.repo.GetProductByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "not_found", Message: "Produk tidak ditemukan"},
		})
		return
	}

	var materials []string
	_ = json.Unmarshal(p.Materials, &materials)
	if materials == nil {
		materials = []string{}
	}
	var dims Dimensions
	_ = json.Unmarshal(p.Dimensions, &dims)

	variants := make([]AdminVariantResponse, 0, len(p.Variants))
	for _, v := range p.Variants {
		variants = append(variants, AdminVariantResponse{
			ID:           v.ID,
			Sku:          v.Sku,
			Color:        v.Color,
			Size:         v.Size,
			Price:        v.Price,
			SalePrice:    v.SalePrice,
			SaleStartsAt: v.SaleStartsAt,
			SaleEndsAt:   v.SaleEndsAt,
			Stock:        v.Stock,
			IsActive:     v.IsActive,
		})
	}

	images := make([]AdminImageResponse, 0, len(p.Images))
	for _, img := range p.Images {
		images = append(images, AdminImageResponse{
			ID:          img.ID,
			StoragePath: img.StoragePath,
			URL:         storage.PublicImageURL(h.supabaseURL, img.StoragePath),
			Alt:         img.Alt,
			IsPrimary:   img.IsPrimary,
		})
	}

	c.JSON(http.StatusOK, httpx.Response{Data: AdminProductDetailResponse{
		ID:               p.ID,
		Slug:             p.Slug,
		Name:             p.Name,
		Description:      p.Description,
		CategorySlug:     p.CategorySlug,
		Materials:        materials,
		Dimensions:       dims,
		WeightKg:         p.WeightKg,
		HasAssemblyGuide: p.HasAssemblyGuide,
		Variants:         variants,
		Images:           images,
	}})
}

// AddProductImage menambah gambar ke produk yang sudah ada (dipakai saat edit).
// storage_path diproduksi FE setelah meng-upload berkas ke Supabase Storage.
func (h *AdminHandler) AddProductImage(c *gin.Context) {
	productID := c.Param("id")
	var req AdminImageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "validation_error", Message: err.Error()},
		})
		return
	}

	img := ProductImage{
		ID:          uuid.New().String(),
		ProductID:   productID,
		StoragePath: req.StoragePath,
		Alt:         req.Alt,
		IsPrimary:   req.IsPrimary,
	}
	if err := h.repo.CreateImage(&img); err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal menambah gambar"},
		})
		return
	}

	c.JSON(http.StatusCreated, httpx.Response{Data: AdminImageResponse{
		ID:          img.ID,
		StoragePath: img.StoragePath,
		URL:         storage.PublicImageURL(h.supabaseURL, img.StoragePath),
		Alt:         img.Alt,
		IsPrimary:   img.IsPrimary,
	}})
}

// UpdateProductImage memperbarui alt / is_primary satu gambar (dipakai saat edit).
func (h *AdminHandler) UpdateProductImage(c *gin.Context) {
	imageID := c.Param("image_id")
	var req AdminImageUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "validation_error", Message: err.Error()},
		})
		return
	}
	if err := h.repo.UpdateImage(imageID, req.Alt, req.IsPrimary); err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal memperbarui gambar"},
		})
		return
	}
	c.JSON(http.StatusOK, httpx.Response{Data: gin.H{"id": imageID}})
}

// DeleteProductImage menghapus satu gambar produk.
func (h *AdminHandler) DeleteProductImage(c *gin.Context) {
	imageID := c.Param("image_id")
	if err := h.repo.DeleteImage(imageID); err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal menghapus gambar"},
		})
		return
	}
	c.JSON(http.StatusOK, httpx.Response{Data: gin.H{"id": imageID}})
}
