package promo

import (
	"github.com/kriya-commerce/api/internal/platform"
)

func RegisterRoutes(deps *platform.Deps, r *platform.Routers) {
	adminRepo := NewAdminRepository(deps.DB)
	adminHandler := NewAdminHandler(adminRepo)

	r.Admin.GET("/stats", adminHandler.Stats)
}
