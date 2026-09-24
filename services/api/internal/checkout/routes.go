package checkout

import (
	"github.com/kriya-commerce/api/internal/platform"
)

func RegisterRoutes(deps *platform.Deps, r *platform.Routers) {
	orderRepo := NewOrderRepository(deps.DB)
	orderHandler := NewOrderHandler(orderRepo, deps.Midtrans)
	paymentHandler := NewPaymentHandler(orderRepo, deps.Midtrans)

	r.Authed.POST("/orders", orderHandler.CreateOrder)
	r.Public.POST("/payments/midtrans/notification", paymentHandler.MidtransNotification)
}
