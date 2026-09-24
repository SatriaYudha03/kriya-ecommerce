package aftersales

import (
	"github.com/kriya-commerce/api/internal/platform"
)

func RegisterRoutes(deps *platform.Deps, r *platform.Routers) {
	orderRepo := NewOrderRepository(deps.DB)
	orderHandler := NewOrderHandler(orderRepo, deps.Midtrans)

	adminRepo := NewAdminRepository(deps.DB)
	adminHandler := NewAdminHandler(adminRepo, orderRepo)

	r.Authed.GET("/orders", orderHandler.ListOrders)
	r.Authed.GET("/orders/:id", orderHandler.GetOrder)

	r.Admin.GET("/orders", adminHandler.ListOrders)
	r.Admin.PUT("/orders/:id/status", adminHandler.UpdateOrderStatus)

	r.Internal.GET("/orders/status", orderHandler.InternalOrderStatus)
}
