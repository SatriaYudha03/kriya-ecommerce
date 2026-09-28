package db

import (
	"context"
	"sync"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Ukuran pool koneksi. Supabase session pooler (port 5432) membatasi jumlah
// client = pool size project (default 15 di tier kecil); melebihinya memicu
// error "max clients reached", jadi batas ini sengaja di bawahnya.
// Idle = open supaya koneksi (beserta cache prepared statement pgx) dipakai
// ulang, bukan dibuang lalu dibuka ulang dengan TLS + auth tiap request.
// Lihat docs/rencana/RENCANA-PERFORMA-LATENSI.md Fase 1.
const (
	maxOpenConns    = 10
	maxIdleConns    = maxOpenConns
	connMaxIdleTime = 30 * time.Minute
	connMaxLifetime = 60 * time.Minute
	warmConns       = 6 // ≈ jumlah request serentak halaman home (categories + rail + facet)
	warmTimeout     = 10 * time.Second
)

// Open membuka koneksi ke Postgres Supabase memakai GORM sebagai ORM runtime.
// Skema TIDAK dibuat GORM — semua perubahan skema lewat file migrasi SQL.
func Open(dsn string) (*gorm.DB, error) {
	gdb, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	sqlDB, err := gdb.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(maxOpenConns)
	sqlDB.SetMaxIdleConns(maxIdleConns)
	sqlDB.SetConnMaxIdleTime(connMaxIdleTime)
	sqlDB.SetConnMaxLifetime(connMaxLifetime)

	warmUp(gdb)
	return gdb, nil
}

// warmUp membuka beberapa koneksi sekaligus saat start agar request pertama
// dari FE (yang datang paralel) tidak menanggung handshake TLS + auth ke
// pooler. Gagal warm-up tidak fatal: koneksi tetap dibuka on-demand.
func warmUp(gdb *gorm.DB) {
	sqlDB, err := gdb.DB()
	if err != nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), warmTimeout)
	defer cancel()

	// Semua Conn() dipanggil serentak sebelum dial mana pun selesai, jadi pool
	// membuka warmConns koneksi terpisah; setelah Close() mereka kembali idle.
	var wg sync.WaitGroup
	for i := 0; i < warmConns; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			conn, err := sqlDB.Conn(ctx)
			if err != nil {
				return
			}
			defer conn.Close()
			_ = conn.PingContext(ctx)
		}()
	}
	wg.Wait()
}
