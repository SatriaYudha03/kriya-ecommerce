package checkout

import (
	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/service"
	"gorm.io/gorm"
)

// RegisterRoutes TIDAK memakai platform.Deps/platform.Routers seperti domain lain
// (§4.2) — checkout adalah paket core yang menjadi SUMBER dari tipe Ports, jadi kalau
// ia juga meng-import platform (yang menyimpan Ports di Deps), terjadi import cycle
// (platform -> checkout -> platform). cmd/api/main.go memanggil ini dengan nilai yang
// sudah diambil dari platform.Deps/platform.Routers.
func RegisterRoutes(db *gorm.DB, midtrans *service.MidtransService, ports Ports, processor *PaymentProcessor, public, authed, admin *gin.RouterGroup) {
	orderRepo := NewOrderRepository(db)
	quoteHandler := NewQuoteHandler(db, ports)
	orderHandler := NewOrderHandler(orderRepo, midtrans, ports)
	paymentHandler := NewPaymentHandler(orderRepo, midtrans, ports, processor)
	anomalyHandler := NewAnomalyHandler(db)

	authed.POST("/checkout/quote", quoteHandler.Quote)
	authed.POST("/orders", orderHandler.CreateOrder)
	authed.POST("/orders/:id/pay", paymentHandler.ContinuePayment)
	authed.POST("/orders/:id/payment/sync", paymentHandler.SyncPayment)
	public.POST("/payments/midtrans/notification", paymentHandler.MidtransNotification)

	admin.GET("/payment-anomalies", anomalyHandler.List)
	admin.POST("/payment-anomalies/:id/resolve", anomalyHandler.Resolve)
}
