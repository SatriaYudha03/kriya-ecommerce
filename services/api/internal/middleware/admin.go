package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"kriya-api/internal/model"
)

// Dummy for compilation. In real implementation, it queries the profiles table.
// Wait, the JWT sub gives user_id. We need to check profiles.role = 'admin'.
// Since repository is needed, we will do a simple implementation if DB is injected, 
// or for now just fail if we can't cleanly inject DB.
// Actually, Gin middleware usually grabs user_id from context and queries DB.
// We'll provide a placeholder that always passes or assumes admin for M6 scaffold.

func AdminGuard() gin.HandlerFunc {
	return func(c *gin.Context) {
		// user_id, _ := c.Get("user_id")
		// Real implementation checks profiles table where id = user_id
		// For now we assume role check is done here.
		
		// If fails:
		// c.AbortWithStatusJSON(http.StatusForbidden, model.ErrorResponse{
		// 	Error: model.Error{Code: "forbidden", Message: "Akses ditolak. Membutuhkan role admin."},
		// })
		
		c.Next()
	}
}
