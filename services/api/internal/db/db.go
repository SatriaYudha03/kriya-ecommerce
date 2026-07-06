package db

import (
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Open membuka koneksi ke Postgres Supabase memakai GORM sebagai ORM runtime.
// Skema TIDAK dibuat GORM — semua perubahan skema lewat file migrasi SQL.
func Open(dsn string) (*gorm.DB, error) {
	return gorm.Open(postgres.Open(dsn), &gorm.Config{})
}
