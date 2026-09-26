package customer

import (
	"github.com/kriya-commerce/api/internal/platform"
)

func RegisterRoutes(deps *platform.Deps, r *platform.Routers) {
	cartRepo := NewCartRepository(deps.DB)
	cartHandler := NewCartHandler(cartRepo, deps.SupabaseURL)

	profileRepo := NewProfileRepository(deps.DB)
	profileHandler := NewProfileHandler(profileRepo)

	r.Authed.GET("/profile", profileHandler.GetProfile)
	r.Authed.PUT("/profile", profileHandler.PutProfile)

	r.Authed.GET("/cart", cartHandler.GetCart)
	r.Authed.PUT("/cart", cartHandler.PutCart)
}
