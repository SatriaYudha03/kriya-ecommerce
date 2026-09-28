**Task**: Diagnosa kenapa semua halaman lambat saat loading (query BE vs batasan Supabase), lalu tulis rencana perbaikan.

**Status**: selesai (diagnosa + rencana). Tidak ada perubahan kode.

**Fitur/bug dicatat**:
- Latensi didominasi round-trip jaringan ke Supabase di Sydney (`aws-1-ap-southeast-2`, RTT ≈ 0,34 s), bukan waktu eksekusi query. Endpoint ≈ jumlah query × RTT; detail produk ≈ 2,7 s warm / 5,6 s cold.
- `services/api/internal/catalog/repository.go` `GetProductBySlug`/`GetProducts`/`GetAttributes`: rantai GORM `Preload` = banyak query berurutan.
- `services/api/internal/db/db.go`: pool tidak dikonfigurasi (default MaxIdleConns = 2).
- `apps/web/app/(store)/products/[slug]/page.tsx`: produk di-fetch di server (`generateMetadata`) lalu di-fetch ulang di client (`useProduct`); `layout.tsx` `getCategories()` tanpa cache.
- Sampingan: `lib/http.ts` `getLocaleCookie()` selalu `"id"` di server → kategori render server selalu ID.
- Baseline angka & skrip ukur: `docs/rencana/RENCANA-PERFORMA-LATENSI.md`.

**Permintaan lintas-teritori**: Fase 4 (pindah project ke Singapura) butuh keputusan Satria.

**Next**: Fase 1 BE (connection pool) → Fase 2 BE (gabung query) → Fase 3 FE (fetch ganda + cache) sesuai `docs/rencana/RENCANA-PERFORMA-LATENSI.md`.
