package platform

import (
	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/checkout"
	"github.com/kriya-commerce/api/internal/config"
	"github.com/kriya-commerce/api/internal/service"
	"gorm.io/gorm"
)

type Deps struct {
	DB          *gorm.DB
	Cfg         config.Config
	Midtrans    *service.MidtransService
	Ports       checkout.Ports
	SupabaseURL string
}

type Routers struct {
	Public   *gin.RouterGroup
	Authed   *gin.RouterGroup
	Admin    *gin.RouterGroup
	Internal *gin.RouterGroup
}
