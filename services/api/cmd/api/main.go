package main

import (
	"log"

	"github.com/gin-gonic/gin"

	"github.com/kriya-commerce/api/internal/config"
	"github.com/kriya-commerce/api/internal/db"
	"github.com/kriya-commerce/api/internal/handler"
	"github.com/kriya-commerce/api/internal/middleware"
	"github.com/kriya-commerce/api/internal/repository"
	"github.com/kriya-commerce/api/internal/service"
)

func main() {
	cfg := config.Load()

	// Koneksi DB
	database, err := db.Open(cfg.SupabaseDBURL)
	if err != nil {
		log.Fatalf("gagal koneksi DB: %v", err)
	}
	log.Println("koneksi DB berhasil")

	r := gin.Default()
	r.Use(middleware.CORS(cfg.WebOrigin))

	r.GET("/healthz", handler.Health)
	
	// Inisialisasi Repo & Handler
	catalogRepo := repository.NewCatalogRepository(database)
	catalogHandler := handler.NewCatalogHandler(catalogRepo, cfg.SupabaseURL)

	cartRepo := repository.NewCartRepository(database)
	cartHandler := handler.NewCartHandler(cartRepo, cfg.SupabaseURL)

	midtransSvc := service.NewMidtransService(cfg.MidtransServerKey, cfg.MidtransClientKey)
	orderRepo := repository.NewOrderRepository(database)
	orderHandler := handler.NewOrderHandler(orderRepo, midtransSvc)
	paymentHandler := handler.NewPaymentHandler(orderRepo, midtransSvc)

	adminRepo := repository.NewAdminRepository(database)
	adminHandler := handler.NewAdminHandler(adminRepo, orderRepo, cfg.SupabaseURL)

	profileRepo := repository.NewProfileRepository(database)
	profileHandler := handler.NewProfileHandler(profileRepo)

	v1 := r.Group("/api/v1")
	v1.GET("/healthz", handler.Health)

	v1.GET("/categories", catalogHandler.GetCategories)
	v1.GET("/products", catalogHandler.GetProducts)
	v1.GET("/products/:slug", catalogHandler.GetProduct)

	// Webhook Midtrans — tanpa auth, verifikasi signature di handler.
	v1.POST("/payments/midtrans/notification", paymentHandler.MidtransNotification)

	// Grup butuh auth.
	jwksURL := ""
	if cfg.SupabaseURL != "" {
		jwksURL = cfg.SupabaseURL + "/auth/v1/.well-known/jwks.json"
	}
	authed := v1.Group("")
	authed.Use(middleware.Auth(jwksURL, cfg.SupabaseJWTSecret))

	authed.GET("/profile", profileHandler.GetProfile)
	authed.PUT("/profile", profileHandler.PutProfile)

	authed.GET("/cart", cartHandler.GetCart)
	authed.PUT("/cart", cartHandler.PutCart)
	authed.POST("/orders", orderHandler.CreateOrder)
	authed.GET("/orders", orderHandler.ListOrders)
	authed.GET("/orders/:id", orderHandler.GetOrder)

	// Grup khusus admin
	admin := authed.Group("/admin")
	admin.Use(middleware.Admin(database))
	
	admin.GET("/stats", adminHandler.Stats)
	admin.GET("/orders", adminHandler.ListOrders)
	admin.PUT("/orders/:id/status", adminHandler.UpdateOrderStatus)
	admin.GET("/products/:id", adminHandler.GetProduct)
	admin.POST("/products", adminHandler.CreateProduct)
	admin.PUT("/products/:id", adminHandler.UpdateProduct)
	admin.DELETE("/products/:id", adminHandler.DeleteProduct)
	admin.POST("/products/:id/images", adminHandler.AddProductImage)
	admin.PUT("/products/:id/images/:image_id", adminHandler.UpdateProductImage)
	admin.DELETE("/products/:id/images/:image_id", adminHandler.DeleteProductImage)
	admin.POST("/products/:id/variants", adminHandler.CreateVariant)
	admin.PUT("/products/:id/variants/:variant_id", adminHandler.UpdateVariant)
	admin.DELETE("/products/:id/variants/:variant_id", adminHandler.DeleteVariant)

	// Grup internal untuk chatbot n8n (diisi M4, endpoint status order sudah M2).
	internal := v1.Group("/internal")
	internal.Use(middleware.InternalKey(cfg.InternalAPIKey))
	internal.GET("/orders/status", orderHandler.InternalOrderStatus)

	log.Printf("api commerce mendengarkan di :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
