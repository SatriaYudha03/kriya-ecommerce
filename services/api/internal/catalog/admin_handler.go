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

// UpdateOrderStatus memperbarui status pesanan.

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
			ID:        uuid.New().String(),
			ProductID: productID,
			Sku:       v.Sku,
			Color:     v.Color,
			Size:      v.Size,
			Price:     v.Price,
			Stock:     v.Stock,
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

	p := Product{
		ID:               productID,
		Slug:             req.Slug,
		Name:             req.Name,
		CategorySlug:     req.CategorySlug,
		Description:      req.Description,
		Materials:        materialsJSON,
		Dimensions:       dimsJSON,
		WeightKg:         req.WeightKg,
		HasAssemblyGuide: req.HasAssemblyGuide,
		Variants:         variants,
		Images:           images,
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
		ID:        uuid.New().String(),
		ProductID: productID,
		Sku:       req.Sku,
		Color:     req.Color,
		Size:      req.Size,
		Price:     req.Price,
		Stock:     req.Stock,
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
		"sku":   req.Sku,
		"color": req.Color,
		"size":  req.Size,
		"price": req.Price,
		"stock": req.Stock,
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

	variants := make([]VariantResponse, 0, len(p.Variants))
	for _, v := range p.Variants {
		variants = append(variants, VariantResponse{
			ID:    v.ID,
			Sku:   v.Sku,
			Color: v.Color,
			Size:  v.Size,
			Price: v.Price,
			Stock: v.Stock,
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
