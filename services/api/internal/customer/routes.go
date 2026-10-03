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


	shippingHandler := NewShippingHandler(deps.DB)

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
	r.Authed.POST("/cart/merge", cartHandler.MergeCart)


	r.Admin.GET("/shipping/zones", shippingHandler.GetAdminZones)
	r.Admin.PUT("/shipping/methods/:id", shippingHandler.UpdateMethod)
	paymentRepo := NewPaymentRepository(deps.DB)
	paymentHandler := NewPaymentHandler(paymentRepo, deps.Midtrans, deps.Cfg.MidtransClientKey)

	r.Authed.POST("/orders/:id/pay", paymentHandler.PayOrder)

	settingsRepo := NewSettingsRepository(deps.DB)
	settingsHandler := NewSettingsHandler(settingsRepo)
	r.Admin.GET("/settings", settingsHandler.GetSettings)
	r.Admin.PUT("/settings", settingsHandler.UpdateSettings)
	r.Public.GET("/store", settingsHandler.GetPublicStore)

	adminCustomerRepo := NewAdminCustomerRepository(deps.DB)
	adminCustomerHandler := NewAdminCustomerHandler(adminCustomerRepo)
	r.Admin.GET("/customers", adminCustomerHandler.GetCustomers)
	r.Admin.GET("/customers/:id", adminCustomerHandler.GetCustomerDetail)
}
