package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kriya-commerce/api/internal/model"
	"github.com/kriya-commerce/api/internal/repository"
)

type AdminHandler struct {
	repo        *repository.AdminRepository
	orderRepo   *repository.OrderRepository
	supabaseURL string
}

func NewAdminHandler(repo *repository.AdminRepository, orderRepo *repository.OrderRepository, supabaseURL string) *AdminHandler {
	return &AdminHandler{repo: repo, orderRepo: orderRepo, supabaseURL: supabaseURL}
}

// ListOrders mengambil semua pesanan dari DB dengan pagination & filter status.
func (h *AdminHandler) ListOrders(c *gin.Context) {
	status := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit > 60 {
		limit = 60
	}
	if page < 1 {
		page = 1
	}

	orders, total, err := h.repo.ListAllOrders(page, limit, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Gagal mengambil pesanan"},
		})
		return
	}

	res := make([]model.OrderResponse, 0, len(orders))
	for _, o := range orders {
		items, err := h.orderRepo.GetItemsByOrderID(o.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, model.ErrorResponse{
				Error: model.ErrorDetail{Code: "internal", Message: "Gagal mengambil item pesanan"},
			})
			return
		}
		res = append(res, ToOrderResponse(o, items))
	}

	c.JSON(http.StatusOK, model.Response{
		Data: res,
		Meta: &model.Meta{
			Page:  page,
			Limit: limit,
			Total: total,
		},
	})
}

// UpdateOrderStatus memperbarui status pesanan.
func (h *AdminHandler) UpdateOrderStatus(c *gin.Context) {
	id := c.Param("id")
	var req model.AdminUpdateOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "validation_error", Message: "Status tidak valid"},
		})
		return
	}

	err := h.repo.UpdateOrderStatus(id, req.Status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Gagal memperbarui status pesanan"},
		})
		return
	}

	c.JSON(http.StatusOK, model.Response{Data: gin.H{"status": req.Status}})
}

// CreateProduct membuat produk baru lengkap beserta varian & gambarnya.
func (h *AdminHandler) CreateProduct(c *gin.Context) {
	var req model.AdminCreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "validation_error", Message: err.Error()},
		})
		return
	}

	materialsJSON, _ := json.Marshal(req.Materials)
	dimsJSON, _ := json.Marshal(req.Dimensions)

	productID := uuid.New().String()

	variants := make([]repository.ProductVariant, len(req.Variants))
	for i, v := range req.Variants {
		variants[i] = repository.ProductVariant{
			ID:        uuid.New().String(),
			ProductID: productID,
			Sku:       v.Sku,
			Color:     v.Color,
			Size:      v.Size,
			Price:     v.Price,
			Stock:     v.Stock,
		}
	}

	images := make([]repository.ProductImage, len(req.Images))
	for i, img := range req.Images {
		images[i] = repository.ProductImage{
			ID:          uuid.New().String(),
			ProductID:   productID,
			StoragePath: img.StoragePath,
			Alt:         img.Alt,
			IsPrimary:   img.IsPrimary,
		}
	}

	p := repository.Product{
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
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Gagal membuat produk"},
		})
		return
	}

	c.JSON(http.StatusCreated, model.Response{Data: p})
}

// UpdateProduct memperbarui properti produk (tidak termasuk varian & gambar).
func (h *AdminHandler) UpdateProduct(c *gin.Context) {
	id := c.Param("id")
	var req model.AdminUpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "validation_error", Message: err.Error()},
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
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Gagal memperbarui produk"},
		})
		return
	}

	c.JSON(http.StatusOK, model.Response{Data: gin.H{"id": id}})
}

// DeleteProduct menghapus produk beserta relasinya.
func (h *AdminHandler) DeleteProduct(c *gin.Context) {
	id := c.Param("id")
	if err := h.repo.DeleteProduct(id); err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Gagal menghapus produk"},
		})
		return
	}
	c.JSON(http.StatusOK, model.Response{Data: gin.H{"id": id}})
}

// CreateVariant menambahkan varian baru untuk suatu produk.
func (h *AdminHandler) CreateVariant(c *gin.Context) {
	productID := c.Param("id")
	var req model.AdminVariantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "validation_error", Message: err.Error()},
		})
		return
	}

	v := repository.ProductVariant{
		ID:        uuid.New().String(),
		ProductID: productID,
		Sku:       req.Sku,
		Color:     req.Color,
		Size:      req.Size,
		Price:     req.Price,
		Stock:     req.Stock,
	}

	if err := h.repo.CreateVariant(&v); err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Gagal membuat varian"},
		})
		return
	}

	c.JSON(http.StatusCreated, model.Response{Data: v})
}

// UpdateVariant memperbarui properti suatu varian (termasuk harga & stok).
func (h *AdminHandler) UpdateVariant(c *gin.Context) {
	variantID := c.Param("variant_id")
	var req model.AdminVariantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "validation_error", Message: err.Error()},
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
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Gagal memperbarui varian"},
		})
		return
	}

	c.JSON(http.StatusOK, model.Response{Data: gin.H{"id": variantID}})
}

// DeleteVariant menghapus varian.
func (h *AdminHandler) DeleteVariant(c *gin.Context) {
	variantID := c.Param("variant_id")
	if err := h.repo.DeleteVariant(variantID); err != nil {
		c.JSON(http.StatusBadRequest, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "validation_error", Message: err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, model.Response{Data: gin.H{"id": variantID}})
}
