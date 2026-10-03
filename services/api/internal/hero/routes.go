package hero

import "github.com/kriya-commerce/api/internal/platform"

func RegisterRoutes(deps *platform.Deps, r *platform.Routers) {
	h := NewHandler(NewRepository(deps.DB), deps.SupabaseURL)
	r.Public.GET("/hero-slides", h.GetPublic)
	r.Admin.GET("/hero-slides", h.GetAdmin)
	r.Admin.PUT("/hero-slides", h.PutAdmin)
}
