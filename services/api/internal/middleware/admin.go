package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/kriya-commerce/api/internal/httpx"
)

// Admin is a middleware that restricts access to admin users.
func Admin(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, httpx.ErrorResponse{
				Error: httpx.ErrorDetail{Code: "unauthorized", Message: "Tidak ada akses."},
			})
			return
		}

		var role string
		err := db.Table("profiles").Select("role").Where("id = ?", userID).Scan(&role).Error
		if err != nil || role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, httpx.ErrorResponse{
				Error: httpx.ErrorDetail{Code: "forbidden", Message: "Akses ditolak. Membutuhkan role admin."},
			})
			return
		}

		c.Next()
	}
}
