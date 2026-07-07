package config

import "os"

// Config menampung seluruh environment yang dipakai service commerce.
// Lihat KRIYA-MASTER.md Bagian 4.
type Config struct {
	Port              string
	SupabaseDBURL     string
	SupabaseURL       string
	SupabaseJWTSecret string
	MidtransServerKey string
	MidtransClientKey string
	WebOrigin         string
	InternalAPIKey    string
}

// Load membaca konfigurasi dari environment. Secret hanya hidup di .env.
func Load() *Config {
	return &Config{
		Port:              getEnv("PORT", "8080"),
		SupabaseDBURL:     os.Getenv("SUPABASE_DB_URL"),
		SupabaseURL:       os.Getenv("SUPABASE_URL"),
		SupabaseJWTSecret: os.Getenv("SUPABASE_JWT_SECRET"),
		MidtransServerKey: os.Getenv("MIDTRANS_SERVER_KEY"),
		MidtransClientKey: os.Getenv("MIDTRANS_CLIENT_KEY"),
		WebOrigin:         getEnv("WEB_ORIGIN", "http://localhost:3000"),
		InternalAPIKey:    os.Getenv("INTERNAL_API_KEY"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
