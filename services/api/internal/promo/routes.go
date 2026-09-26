package promo

import (
	"github.com/kriya-commerce/api/internal/platform"
)

func RegisterRoutes(deps *platform.Deps, r *platform.Routers) {
	adminRepo := NewAdminRepository(deps.DB)
	adminHandler := NewAdminHandler(adminRepo)

	couponRepo := NewCouponRepository(deps.DB)
	couponHandler := NewCouponHandler(couponRepo)

	r.Admin.GET("/stats", adminHandler.Stats)

	coupons := r.Admin.Group("/coupons")
	{
		coupons.GET("", couponHandler.List)
		coupons.POST("", couponHandler.Create)
		coupons.GET("/:id", couponHandler.Detail)
		coupons.PUT("/:id", couponHandler.Update)
		coupons.DELETE("/:id", couponHandler.Delete)
		coupons.GET("/:id/redemptions", couponHandler.ListRedemptions)
	}
}
