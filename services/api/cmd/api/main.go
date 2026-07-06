package main

import (
	"log"

	"github.com/gin-gonic/gin"

	"github.com/kriya-commerce/api/internal/config"
	"github.com/kriya-commerce/api/internal/db"
	"github.com/kriya-commerce/api/internal/handler"
	"github.com/kriya-commerce/api/internal/middleware"
)

func main() {
	cfg := config.Load()

	// Koneksi DB opsional saat M0 agar healthz tetap hidup tanpa DB.
	if cfg.SupabaseDBURL != "" {
		if _, err := db.Open(cfg.SupabaseDBURL); err != nil {
			log.Printf("peringatan: gagal koneksi DB: %v", err)
		} else {
			log.Println("koneksi DB berhasil")
		}
	} else {
		log.Println("SUPABASE_DB_URL kosong — melewati koneksi DB (scaffold M0)")
	}

	r := gin.Default()
	r.Use(middleware.CORS(cfg.WebOrigin))

	r.GET("/healthz", handler.Health)

	v1 := r.Group("/api/v1")
	v1.GET("/healthz", handler.Health)
	// Endpoint katalog, cart, orders, webhook ditambahkan pada M1+.

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
