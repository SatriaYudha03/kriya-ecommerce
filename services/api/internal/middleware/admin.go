package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Admin memverifikasi apakah role pengguna di tabel profiles bernilai 'admin'.
// Menolak dengan 403 Forbidden jika bukan admin.
func Admin(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("user_id")
		if userID == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"code": "unauthorized", "message": "unauthorized"},
			})
			return
		}

		var role string
		err := db.Table("profiles").Select("role").Where("id = ?", userID).Row().Scan(&role)
		if err != nil || role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": gin.H{"code": "forbidden", "message": "akses ditolak, hanya untuk admin"},
			})
			return
		}

		c.Next()
	}
}
