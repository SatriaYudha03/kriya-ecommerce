package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/kriya-commerce/api/internal/httpx"
)

// adminRoleTTL membatasi berapa lama status admin di-cache di memori. Hanya
// hasil "admin" yang di-cache, jadi pencabutan role baru berlaku paling lama
// selama TTL ini. Tujuannya menghemat 1 round-trip DB per request admin.
const adminRoleTTL = 5 * time.Minute

// Admin is a middleware that restricts access to admin users.
func Admin(db *gorm.DB) gin.HandlerFunc {
	var admins sync.Map // user_id (string) -> kedaluwarsa (time.Time)

	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, httpx.ErrorResponse{
				Error: httpx.ErrorDetail{Code: "unauthorized", Message: "Tidak ada akses."},
			})
			return
		}

		uid, _ := userID.(string)
		if exp, ok := admins.Load(uid); ok {
			if until, ok := exp.(time.Time); ok && time.Now().Before(until) {
				c.Next()
				return
			}
			admins.Delete(uid)
		}

		var role string
		err := db.Table("profiles").Select("role").Where("id = ?", userID).Scan(&role).Error
		if err != nil || role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, httpx.ErrorResponse{
				Error: httpx.ErrorDetail{Code: "forbidden", Message: "Akses ditolak. Membutuhkan role admin."},
			})
			return
		}

		if uid != "" {
			admins.Store(uid, time.Now().Add(adminRoleTTL))
		}
		c.Next()
	}
}
