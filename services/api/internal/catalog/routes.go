package catalog

import (
	"github.com/kriya-commerce/api/internal/platform"
)

func RegisterRoutes(deps *platform.Deps, r *platform.Routers) {
	repo := NewCatalogRepository(deps.DB)
	handler := NewCatalogHandler(repo, deps.SupabaseURL)

	adminRepo := NewAdminRepository(deps.DB)
	adminHandler := NewAdminHandler(adminRepo, deps.SupabaseURL)

	r.Public.GET("/categories", handler.GetCategories)
	r.Public.GET("/products", handler.GetProducts)
	r.Public.GET("/products/:slug", handler.GetProduct)
	r.Public.GET("/products/:slug/related", handler.GetRelatedProducts)

	r.Admin.GET("/categories", adminHandler.ListCategories)
	r.Admin.GET("/categories/:id", adminHandler.GetCategory)
	r.Admin.POST("/categories", adminHandler.CreateCategory)
	r.Admin.PUT("/categories/:id", adminHandler.UpdateCategory)
	r.Admin.DELETE("/categories/:id", adminHandler.DeleteCategory)

	r.Admin.GET("/products", adminHandler.ListProducts)
	r.Admin.GET("/products/:id", adminHandler.GetProduct)
	r.Admin.POST("/products", adminHandler.CreateProduct)
	r.Admin.PUT("/products/:id", adminHandler.UpdateProduct)
	r.Admin.DELETE("/products/:id", adminHandler.DeleteProduct)
	r.Admin.POST("/products/:id/images", adminHandler.AddProductImage)
	r.Admin.PUT("/products/:id/images/:image_id", adminHandler.UpdateProductImage)
	r.Admin.DELETE("/products/:id/images/:image_id", adminHandler.DeleteProductImage)
	r.Admin.POST("/products/:id/variants", adminHandler.CreateVariant)
	r.Admin.PUT("/products/:id/variants/:variant_id", adminHandler.UpdateVariant)
	r.Admin.DELETE("/products/:id/variants/:variant_id", adminHandler.DeleteVariant)

	r.Admin.GET("/inventory", adminHandler.ListInventory)
	r.Admin.GET("/inventory/movements", adminHandler.ListMovements)
	r.Admin.POST("/inventory/adjustments", adminHandler.CreateAdjustment)
}
