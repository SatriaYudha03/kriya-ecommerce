**Task**: Fase 1 `docs/rencana/RENCANA-PERFORMA-LATENSI.md` — konfigurasi connection pool API Gin.

**Status**: selesai. `go build` / `go vet` / `go test ./...` (67 test) hijau.

**Fitur/bug dicatat**:
- `services/api/internal/db/db.go`: sebelumnya pool default `database/sql` (MaxIdleConns = 2) → request serentak membuka koneksi baru (TLS + auth ke pooler Sydney ≈ 2–3 s) lalu membuangnya. Sekarang MaxOpen = MaxIdle = 10 (di bawah batas client session pooler Supabase), ConnMaxIdleTime 30 m, ConnMaxLifetime 60 m, warm-up 6 koneksi paralel saat start (gagal warm-up tidak fatal).
- Ukuran (burst serentak ala home, 6 endpoint, 3 kali): sebelum 7,9 / 7,0 / 5,8 s → sesudah 4,8 / 4,3 / 4,3 s. Endpoint tunggal berurutan tidak berubah (sasaran Fase 2).
- Temuan: cache prepared statement pgx per koneksi per teks SQL → query pertama di tiap koneksi +1 RTT; `Preload` GORM dengan `IN ($1..$n)` variabel memperparah. Dicatat sebagai masukan Fase 2 di dokumen rencana. Ganti mode pgx ke exec/simple protocol sengaja tidak dilakukan (risiko param `[]byte` → `jsonb`).
- `SkipDefaultTransaction` tidak diubah.

**Permintaan lintas-teritori**: tidak ada. (Fase 4 pindah region tetap keputusan Satria.)

**Next**: Fase 2 BE — gabungkan `Preload` di `catalog/repository.go` (detail, list, attributes, related) jadi 1–2 query ber-SQL stabil, dengan golden diff respons sebelum/sesudah.
