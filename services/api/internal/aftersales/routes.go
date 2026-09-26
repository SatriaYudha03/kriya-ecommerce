package aftersales

import (
	"github.com/kriya-commerce/api/internal/platform"
)

func RegisterRoutes(deps *platform.Deps, r *platform.Routers) {
	orderRepo := NewOrderRepository(deps.DB)
	orderHandler := NewOrderHandler(orderRepo, deps.Midtrans)

	adminRepo := NewAdminRepository(deps.DB)
	adminHandler := NewAdminHandler(adminRepo, orderRepo)

	reviewRepo := NewReviewRepository(deps.DB)
	reviewHandler := NewReviewHandler(reviewRepo)

	// Orders
	r.Authed.GET("/orders", orderHandler.ListOrders)
	r.Authed.GET("/orders/:id", orderHandler.GetOrder)
	r.Authed.POST("/orders/:id/cancel", orderHandler.CancelOrder)

	// Reviews
	r.Public.GET("/products/:slug/reviews", reviewHandler.GetProductReviews)
	r.Public.GET("/products/:slug/reviews/summary", reviewHandler.GetProductReviewSummary)
	
	r.Authed.GET("/me/reviewables", reviewHandler.GetMyReviewables)
	r.Authed.GET("/me/reviews", reviewHandler.GetMyReviews)
	r.Authed.POST("/reviews", reviewHandler.CreateReview)
	r.Authed.PUT("/reviews/:id", reviewHandler.UpdateReview)

	// Admin Orders
	r.Admin.GET("/orders", adminHandler.ListOrders)
	r.Admin.GET("/orders/:id", adminHandler.GetOrder)
	r.Admin.PUT("/orders/:id/status", adminHandler.UpdateOrderStatus)
	r.Admin.POST("/orders/:id/notes", adminHandler.AddOrderNote)

	// Admin Reviews
	r.Admin.GET("/reviews", reviewHandler.GetAdminReviews)
	r.Admin.PUT("/reviews/:id", reviewHandler.AdminUpdateReview)

	r.Internal.GET("/orders/status", orderHandler.InternalOrderStatus)
}
