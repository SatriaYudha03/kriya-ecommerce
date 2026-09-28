**Task**: Fase 2 `docs/rencana/RENCANA-PERFORMA-LATENSI.md` — gabungkan rantai GORM `Preload` di endpoint katalog publik jadi satu query per endpoint.

**Status**: selesai. `go build` / `go vet` / `go test ./...` (70 test, 3 baru) hijau.

**Fitur/bug dicatat**:
- `services/api/internal/catalog/aggregate.go` (baru): subquery `json_agg` bertipe konstan untuk varian aktif, gambar (utama/semua), tag, term atribut + atribut, kategori + induk; struct JSON eksplisit (tanpa `any`) + konversi ke model lama.
- `services/api/internal/catalog/repository.go`: `GetProducts` (1 query, total via `COUNT(*) OVER()`; count terpisah hanya bila halaman kosong di luar jangkauan), `GetProductBySlug` (1 query, dulu 8), `GetRelatedProducts` (1, dulu 3), `GetAttributesWithCounts` (1, dulu 3; menggantikan `GetAttributes` + `GetProductCountsForTerms`). `handler.go` hanya ganti pemanggilan atribut.
- Hasil warm: semua endpoint ≈ 0,35 s (= 1 RTT ke Sydney). Detail produk 2,82 → 0,35 s; list 1,42 → 0,36 s; burst home 3,9–4,4 → 1,5 s. Tabel lengkap di dokumen rencana.
- Golden test 448 respons + fixture sementara `zz-perf-*` (sudah dihapus; DB dev kembali 60 produk / 0 relasi / 0 tag). Beda hanya urutan varian 9 produk (isi identik).
- Temuan: (1) urutan varian/gambar lama tidak stabil (urutan fisik, bergeser tiap UPDATE) → kini eksplisit; (2) `sale_ends_at` keluar di zona lokal mesin, bukan UTC per kontrak — dipertahankan, perlu keputusan; (3) pool size Supabase = 15, dua instance API (10 koneksi masing-masing) → `EMAXCONNSESSION`.

**Permintaan lintas-teritori**: keputusan Satria — apakah `sale_ends_at` (dan timestamp lain dari API) dipaksa UTC sesuai kontrak Bagian 5.

**Next**: Fase 3 FE (hapus fetch ganda detail produk + cache kategori di layout), lalu opsional Fase 4 (pindah region Singapura).
