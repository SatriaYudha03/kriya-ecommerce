package customer

import (
	"github.com/kriya-commerce/api/internal/platform"
)

func RegisterRoutes(deps *platform.Deps, r *platform.Routers) {
	cartRepo := NewCartRepository(deps.DB)
	cartHandler := NewCartHandler(cartRepo, deps.SupabaseURL)

	profileRepo := NewProfileRepository(deps.DB)
	profileHandler := NewProfileHandler(profileRepo)

	addressRepo := NewAddressRepository(deps.DB)
	addressHandler := NewAddressHandler(addressRepo)

	r.Authed.GET("/profile", profileHandler.GetProfile)
	r.Authed.PUT("/profile", profileHandler.PutProfile)

	r.Authed.GET("/addresses", addressHandler.GetAddresses)
	r.Authed.POST("/addresses", addressHandler.CreateAddress)
	r.Authed.PUT("/addresses/:id", addressHandler.UpdateAddress)
	r.Authed.DELETE("/addresses/:id", addressHandler.DeleteAddress)
	r.Authed.POST("/addresses/:id/default", addressHandler.SetDefaultAddress)

	r.Public.GET("/shipping/provinces", addressHandler.GetProvinces)

	r.Authed.GET("/cart", cartHandler.GetCart)
	r.Authed.PUT("/cart", cartHandler.PutCart)
}
