package middleware

import (
	"context"
	"log"
	"net/http"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// Auth memverifikasi JWT Supabase dan menaruh klaim `sub` sebagai user_id di
// context. Supabase punya dua sistem signing key (lihat docs/KRIYA-MASTER.md
// Bagian 4):
//   - JWT signing keys (asimetrik, mis. ES256/RS256) — diverifikasi lewat
//     JWKS project di jwksURL ("<SUPABASE_URL>/auth/v1/.well-known/jwks.json").
//   - Legacy JWT secret (HS256) — fallback bila token masih ditandatangani
//     dengan secret lama, mis. selama masa transisi rotasi key.
//
// jwksURL boleh kosong (mis. saat SUPABASE_URL belum diset); dalam kondisi
// itu hanya token HS256 dengan legacySecret yang diterima.
func Auth(jwksURL string, legacySecret string) gin.HandlerFunc {
	var jwks keyfunc.Keyfunc
	if jwksURL != "" {
		k, err := keyfunc.NewDefaultCtx(context.Background(), []string{jwksURL})
		if err != nil {
			log.Printf("auth: gagal memuat JWKS Supabase dari %s: %v", jwksURL, err)
		} else {
			jwks = k
		}
	}

	keyFn := func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); ok {
			if legacySecret == "" {
				return nil, jwt.ErrTokenUnverifiable
			}
			return []byte(legacySecret), nil
		}
		if jwks == nil {
			return nil, jwt.ErrTokenUnverifiable
		}
		return jwks.Keyfunc(t)
	}

	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"code": "unauthorized", "message": "token tidak ditemukan"},
			})
			return
		}
		tokenString := strings.TrimPrefix(header, "Bearer ")
		token, err := jwt.Parse(tokenString, keyFn)
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"code": "unauthorized", "message": "token tidak valid"},
			})
			return
		}
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"code": "unauthorized", "message": "klaim token tidak valid"},
			})
			return
		}
		if sub, ok := claims["sub"].(string); ok {
			c.Set("user_id", sub)
		}
		c.Next()
	}
}
