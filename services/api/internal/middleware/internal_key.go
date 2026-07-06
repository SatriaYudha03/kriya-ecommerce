package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// InternalKey melindungi endpoint internal antar-service dengan shared secret
// INTERNAL_API_KEY yang dikirim lewat header X-Internal-Key.
func InternalKey(key string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if key == "" || c.GetHeader("X-Internal-Key") != key {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": gin.H{"code": "forbidden", "message": "akses ditolak"},
			})
			return
		}
		c.Next()
	}
}
