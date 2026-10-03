package config

import (
	"log"
	"os"
	"time"
)

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
	// Sweeper order pending yang lewat tenggat (RENCANA-PAYMENT-LIFECYCLE Fase 5).
	// Format durasi Go ("5m", "30s"); PAYMENT_SWEEP_INTERVAL=0 mematikan sweeper.
	PaymentSweepInterval time.Duration
	PaymentSweepGrace    time.Duration
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

		PaymentSweepInterval: getDuration("PAYMENT_SWEEP_INTERVAL", 5*time.Minute),
		PaymentSweepGrace:    getDuration("PAYMENT_SWEEP_GRACE", 10*time.Minute),
	}
}

// getDuration membaca durasi Go dari env; nilai tidak valid jatuh ke fallback (dicatat).
func getDuration(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	if v == "0" {
		return 0
	}
	d, err := time.ParseDuration(v)
	if err != nil || d < 0 {
		log.Printf("config: %s=%q tidak valid, memakai %s", key, v, fallback)
		return fallback
	}
	return d
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
