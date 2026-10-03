package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

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
	paymentProcessor := checkout.NewPaymentProcessor(deps.DB, deps.Ports)
	checkout.RegisterRoutes(deps.DB, deps.Midtrans, deps.Ports, paymentProcessor, routers.Public, routers.Authed, routers.Admin)
	aftersales.RegisterRoutes(deps, routers)
	promo.RegisterRoutes(deps, routers)
	hero.RegisterRoutes(deps, routers)

	// Graceful shutdown (RENCANA-PAYMENT-LIFECYCLE Fase 5): SIGINT/SIGTERM menghentikan
	// sweeper lalu menunggu request yang sedang berjalan (mis. CreateOrder yang sedang
	// memanggil Snap) selesai, alih-alih memutusnya di tengah jalan.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	sweeper := checkout.NewExpirySweeper(deps.DB, deps.Midtrans, deps.Ports, paymentProcessor, checkout.SweeperConfig{
		Interval: cfg.PaymentSweepInterval,
		Grace:    cfg.PaymentSweepGrace,
	})
	sweeperDone := make(chan struct{})
	go func() {
		defer close(sweeperDone)
		sweeper.Run(ctx)
	}()

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second, // > timeout klien Midtrans (15s) + query DB
		IdleTimeout:       120 * time.Second,
	}
	serveErr := make(chan error, 1)
	go func() {
		log.Printf("api commerce mendengarkan di :%s", cfg.Port)
		serveErr <- srv.ListenAndServe()
	}()

	select {
	case err := <-serveErr:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	case <-ctx.Done():
		log.Println("sinyal berhenti diterima, menutup server...")
	}
	stop()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown server tidak bersih: %v", err)
	}
	select {
	case <-sweeperDone:
	case <-shutdownCtx.Done():
		log.Println("sweeper belum selesai saat batas waktu shutdown")
	}
	log.Println("api commerce berhenti")
}
