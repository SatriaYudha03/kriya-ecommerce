package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/model"
	"github.com/kriya-commerce/api/internal/repository"
)

type CatalogHandler struct {
	repo *repository.CatalogRepository
}

func NewCatalogHandler(repo *repository.CatalogRepository) *CatalogHandler {
	return &CatalogHandler{repo: repo}
}

func (h *CatalogHandler) GetCategories(c *gin.Context) {
	categories, err := h.repo.GetCategories()
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Failed to fetch categories"},
		})
		return
	}

	var res []model.CategoryResponse
	for _, cat := range categories {
		res = append(res, model.CategoryResponse{
			ID:   cat.ID,
			Slug: cat.Slug,
			Name: cat.Name,
		})
	}

	c.JSON(http.StatusOK, model.Response{Data: res})
}

func (h *CatalogHandler) GetProducts(c *gin.Context) {
	category := c.Query("category")
	q := c.Query("q")
	sort := c.Query("sort")

	minPrice, _ := strconv.Atoi(c.Query("min_price"))
	maxPrice, _ := strconv.Atoi(c.Query("max_price"))
	
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit > 60 {
		limit = 60
	}
	if page < 1 {
		page = 1
	}

	products, total, err := h.repo.GetProducts(category, q, sort, minPrice, maxPrice, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Failed to fetch products"},
		})
		return
	}

	var res []model.ProductListResponse
	for _, p := range products {
		minP := 0
		if len(p.Variants) > 0 {
			minP = p.Variants[0].Price
			for _, v := range p.Variants {
				if v.Price < minP {
					minP = v.Price
				}
			}
		}

		thumb := ""
		if len(p.Images) > 0 {
			thumb = p.Images[0].StoragePath
		}

		res = append(res, model.ProductListResponse{
			ID:           p.ID,
			Slug:         p.Slug,
			Name:         p.Name,
			CategorySlug: p.CategorySlug,
			PriceMin:     minP,
			ThumbnailURL: thumb,
		})
	}
	
	if res == nil {
		res = []model.ProductListResponse{} // return empty array instead of null
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

func (h *CatalogHandler) GetProduct(c *gin.Context) {
	slug := c.Param("slug")
	p, err := h.repo.GetProductBySlug(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "not_found", Message: "Product not found"},
		})
		return
	}

	var materials []string
	if len(p.Materials) > 0 {
		json.Unmarshal(p.Materials, &materials)
	}

	var dims model.Dimensions
	if len(p.Dimensions) > 0 {
		json.Unmarshal(p.Dimensions, &dims)
	}

	var images []model.ImageResponse
	for _, img := range p.Images {
		images = append(images, model.ImageResponse{
			URL: img.StoragePath,
			Alt: img.Alt,
		})
	}

	var variants []model.VariantResponse
	for _, v := range p.Variants {
		variants = append(variants, model.VariantResponse{
			ID:    v.ID,
			Sku:   v.Sku,
			Color: v.Color,
			Size:  v.Size,
			Price: v.Price,
			Stock: v.Stock,
		})
	}

	res := model.ProductDetailResponse{
		ID:          p.ID,
		Slug:        p.Slug,
		Name:        p.Name,
		Description: p.Description,
		Category: model.CategoryRef{
			Slug: p.Category.Slug,
			Name: p.Category.Name,
		},
		Materials:        materials,
		Dimensions:       dims,
		WeightKg:         p.WeightKg,
		Images:           images,
		Variants:         variants,
		HasAssemblyGuide: p.HasAssemblyGuide,
	}

	c.JSON(http.StatusOK, model.Response{Data: res})
}
