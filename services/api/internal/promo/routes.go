package promo

import (
	"github.com/kriya-commerce/api/internal/platform"
)

func RegisterRoutes(deps *platform.Deps, r *platform.Routers) {
	adminRepo := NewAdminRepository(deps.DB)
	adminHandler := NewAdminHandler(adminRepo)

	couponRepo := NewCouponRepository(deps.DB)
	discountApplier := NewDiscountApplier()
	couponHandler := NewCouponHandler(couponRepo, discountApplier, deps.DB)

	r.Admin.GET("/stats", adminHandler.Stats)
	r.Admin.GET("/reports/summary", adminHandler.ReportSummary)
	r.Admin.GET("/reports/sales", adminHandler.ReportSales)
	r.Admin.GET("/reports/top-products", adminHandler.ReportTopProducts)
	r.Admin.GET("/reports/breakdown", adminHandler.ReportBreakdown)

	pubCoupons := r.Public.Group("/coupons")
	{
		pubCoupons.GET("/public", couponHandler.GetPublicCoupons)
		pubCoupons.POST("/validate", couponHandler.ValidateCoupon)
	}

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
