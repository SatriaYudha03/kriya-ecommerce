# Log Agent - [Agent Name / Task ID]

## Status Terkini
- **Task Terakhir:** C6
- **Status:** Selesai
- **Commit Terakhir:** (diisi setelah commit)

## Log
*Catat langkah-langkah yang sudah diambil, keputusan penting, dan masalah (beserta solusinya) di sini. Satu baris atau paragraf per sesi.*

- 2026-09-26 - C2 (Mesin diskon) selesai. Implementasi DiscountApplier untuk module checkout di `services/api/internal/promo/discount.go`. Unit test murni (tanpa sqlite tambahan, `evaluateCouponCore`) menutupi 21 kasus. Branch di-push ke `ec/C2-mesin-diskon`.
- 2026-09-27 - C3: Menyelesaikan implementasi validasi kupon (POST /coupons/validate) dan list kupon publik (GET /coupons/public). Mengisi stub CouponInput dan PromoBanner di FE.
- 2026-09-27 - C4: Selesai mengimplementasi API Laporan (summary, sales, top-products) serta antarmuka UI (cards, SVG chart, table, CSV download) di domain C.
- 2026-09-27 - C5: Selesai memodifikasi `GET /admin/stats` dengan query SQL baca-saja, dan mengimplementasi dashboard admin di frontend.
- 2026-09-27 - C6: Memulai penulisan e2e promo `e2e/ec-promo.spec.ts`. Skenario CRUD, Validasi API, Laporan, dan Dashboard sudah ditulis. Namun saat dijalankan, terblokir F0 bug di module checkout (lihat Permintaan Lintas Domain). Sesuai aturan, saya BERHENTI dan tidak menambal domain lain. Task C6 belum bisa ditutup ✅.
- 2026-09-27 - C6 (lanjutan): Blocker checkout sudah diperbaiki Agent B (commit `060df7f`). Melanjutkan E2E: 5 test (CRUD via API, validasi, banner publik, laporan, dashboard) semua hijau. Menemukan & memperbaiki 1 bug di domain C: `stats_repo.go` `Stats()` memilih kolom `customer_email` yang tidak ada di tabel `orders` (membuat `/admin/stats` 500 → `AdminGuard` tidak bisa render halaman admin), diganti `'' AS customer_email`. Data uji (kupon `ECC-*`, redemption dummy, order dummy) dibersihkan di `afterAll`.

## Permintaan lintas-domain
*Format: YYYY-MM-DD - TaskID - BUTUH: ... - ALASAN: ... - MEMBLOKIR: (ya/tidak) - USULAN: ...*

- 2026-09-27 - C6 - BUTUH: Perbaikan `checkout.PriceLines` di `services/api/internal/checkout/pricing.go`. - ALASAN: Query SQL di `pricing.go` baris 33 mengambil `p.category_id`, padahal tabel `products` hanya memiliki `category_slug`. Hal ini menyebabkan endpoint `POST /api/v1/coupons/validate` selalu mengembalikan 500 "Gagal menghitung harga barang". - MEMBLOKIR: ya (saat itu) - USULAN: Ubah `p.category_id` menjadi `p.category_slug as category_id`. - STATUS: SELESAI (Agent B, commit `060df7f` "fix(checkout): correct CategoryID join and WeightKg scanning in PriceLines").
