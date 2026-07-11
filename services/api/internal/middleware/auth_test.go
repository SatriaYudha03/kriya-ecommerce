package middleware

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func b64url(b []byte) string {
	return base64.RawURLEncoding.EncodeToString(b)
}

// jwksServer menyalakan HTTP server lokal yang menyajikan JWKS berisi kunci
// publik dari priv, meniru "<SUPABASE_URL>/auth/v1/.well-known/jwks.json"
// untuk project yang memakai JWT signing keys asimetrik (ES256).
func jwksServer(t *testing.T, kid string, priv *ecdsa.PrivateKey) *httptest.Server {
	t.Helper()
	jwk := map[string]any{
		"kty": "EC",
		"crv": "P-256",
		"kid": kid,
		"alg": "ES256",
		"use": "sig",
		"x":   b64url(priv.PublicKey.X.FillBytes(make([]byte, 32))),
		"y":   b64url(priv.PublicKey.Y.FillBytes(make([]byte, 32))),
	}
	body, err := json.Marshal(map[string]any{"keys": []any{jwk}})
	if err != nil {
		t.Fatalf("marshal jwks: %v", err)
	}
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(body)
	}))
}

func newRouter(h gin.HandlerFunc) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/protected", h, func(c *gin.Context) {
		uid, _ := c.Get("user_id")
		c.JSON(http.StatusOK, gin.H{"user_id": uid})
	})
	return r
}

func doRequest(r *gin.Engine, bearer string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	return rec
}

// Reproduksi bug: token ES256 (kondisi project Supabase yang sudah migrasi ke
// JWT signing keys) harus diterima lewat verifikasi JWKS, bukan ditolak
// sebagai "token tidak valid" seperti sebelum perbaikan (middleware lama
// hardcode HS256).
func TestAuth_ES256ViaJWKS(t *testing.T) {
	kid := "test-kid"
	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	srv := jwksServer(t, kid, priv)
	defer srv.Close()

	token := jwt.NewWithClaims(jwt.SigningMethodES256, jwt.MapClaims{
		"sub": "user-es256-123",
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	token.Header["kid"] = kid
	signed, err := token.SignedString(priv)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}

	r := newRouter(Auth(srv.URL, ""))
	rec := doRequest(r, signed)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if want := `"user_id":"user-es256-123"`; !strings.Contains(rec.Body.String(), want) {
		t.Fatalf("expected body to contain %q, got %s", want, rec.Body.String())
	}
}

// Fallback lama harus tetap jalan selama masa transisi (token HS256 yang
// ditandatangani dengan legacy JWT secret).
func TestAuth_HS256Legacy(t *testing.T) {
	secret := "legacy-secret"
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": "user-hs256-456",
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}

	r := newRouter(Auth("", secret))
	rec := doRequest(r, signed)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if want := `"user_id":"user-hs256-456"`; !strings.Contains(rec.Body.String(), want) {
		t.Fatalf("expected body to contain %q, got %s", want, rec.Body.String())
	}
}

func TestAuth_RejectsInvalidToken(t *testing.T) {
	kid := "test-kid"
	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	srv := jwksServer(t, kid, priv)
	defer srv.Close()

	r := newRouter(Auth(srv.URL, "legacy-secret"))

	cases := []struct {
		name   string
		bearer string
	}{
		{"missing token", ""},
		{"garbage token", "not-a-jwt"},
		{"wrong secret HS256", func() string {
			tok := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": "x"})
			s, _ := tok.SignedString([]byte("wrong-secret"))
			return s
		}()},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := doRequest(r, tc.bearer)
			if rec.Code != http.StatusUnauthorized {
				t.Fatalf("expected 401, got %d: %s", rec.Code, rec.Body.String())
			}
		})
	}
}
