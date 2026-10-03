package main

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/aftersales"
	"github.com/kriya-commerce/api/internal/catalog"
	"github.com/kriya-commerce/api/internal/checkout"
	"github.com/kriya-commerce/api/internal/config"
	"github.com/kriya-commerce/api/internal/customer"
	"github.com/kriya-commerce/api/internal/hero"
	"github.com/kriya-commerce/api/internal/db"
	"github.com/kriya-commerce/api/internal/httpx"
	"github.com/kriya-commerce/api/internal/middleware"
	"github.com/kriya-commerce/api/internal/platform"
	"github.com/kriya-commerce/api/internal/promo"
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

	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, httpx.Response{Data: gin.H{"status": "ok"}})
	})

	v1 := r.Group("/api/v1")
	v1.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, httpx.Response{Data: gin.H{"status": "ok"}})
	})

	jwksURL := ""
	if cfg.SupabaseURL != "" {
		jwksURL = cfg.SupabaseURL + "/auth/v1/.well-known/jwks.json"
	}
	authed := v1.Group("")
	authed.Use(middleware.Auth(jwksURL, cfg.SupabaseJWTSecret))

	admin := authed.Group("/admin")
	admin.Use(middleware.Admin(database))
	// Probe ringan untuk gerbang FE: lolos middleware Admin = pengguna adalah admin.
	admin.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"data": gin.H{"ok": true}})
	})

	internal := v1.Group("/internal")
	internal.Use(middleware.InternalKey(cfg.InternalAPIKey))

	routers := &platform.Routers{
		Public:   v1,
		Authed:   authed,
		Admin:    admin,
		Internal: internal,
	}

	ports := checkout.Ports{
		Shipping:  customer.NewShippingQuoter(),
		Discounts: promo.NewDiscountApplier(),
		Inventory: catalog.NewInventoryLedger(),
		Events:    aftersales.NewOrderEventRecorder(),
	}

	deps := &platform.Deps{
		DB:          database,
		Cfg:         *cfg,
		Midtrans:    service.NewMidtransService(cfg.MidtransServerKey, cfg.MidtransClientKey),
		Ports:       ports,
		SupabaseURL: cfg.SupabaseURL,
	}

	catalog.RegisterRoutes(deps, routers)
	customer.RegisterRoutes(deps, routers)
	checkout.RegisterRoutes(deps.DB, deps.Midtrans, deps.Ports, routers.Public, routers.Authed)
	aftersales.RegisterRoutes(deps, routers)
	promo.RegisterRoutes(deps, routers)
	hero.RegisterRoutes(deps, routers)

	log.Printf("api commerce mendengarkan di :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
