package main

import (
	"log"

	"github.com/gin-gonic/gin"

	"github.com/kriya-commerce/api/internal/config"
	"github.com/kriya-commerce/api/internal/db"
	"github.com/kriya-commerce/api/internal/handler"
	"github.com/kriya-commerce/api/internal/middleware"
	"github.com/kriya-commerce/api/internal/repository"
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
	catalogHandler := handler.NewCatalogHandler(catalogRepo)

	v1 := r.Group("/api/v1")
	v1.GET("/healthz", handler.Health)
	
	v1.GET("/categories", catalogHandler.GetCategories)
	v1.GET("/products", catalogHandler.GetProducts)
	v1.GET("/products/:slug", catalogHandler.GetProduct)


	// Grup butuh auth (diisi M2+); didaftarkan agar middleware ikut ter-compile.
	authed := v1.Group("")
	authed.Use(middleware.Auth(cfg.SupabaseJWTSecret))

	// Grup internal untuk chatbot n8n (diisi M4).
	internal := v1.Group("/internal")
	internal.Use(middleware.InternalKey(cfg.InternalAPIKey))

	log.Printf("api commerce mendengarkan di :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
