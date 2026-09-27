# Log Agent - [Agent Name / Task ID]

## Status Terkini
- **Task Terakhir:** C5
- **Status:** Selesai
- **Commit Terakhir:** 1e7d457

## Log
*Catat langkah-langkah yang sudah diambil, keputusan penting, dan masalah (beserta solusinya) di sini. Satu baris atau paragraf per sesi.*

- 2026-09-26 - C2 (Mesin diskon) selesai. Implementasi DiscountApplier untuk module checkout di `services/api/internal/promo/discount.go`. Unit test murni (tanpa sqlite tambahan, `evaluateCouponCore`) menutupi 21 kasus. Branch di-push ke `ec/C2-mesin-diskon`.
- 2026-09-27 - C3: Menyelesaikan implementasi validasi kupon (POST /coupons/validate) dan list kupon publik (GET /coupons/public). Mengisi stub CouponInput dan PromoBanner di FE.
- 2026-09-27 - C4: Selesai mengimplementasi API Laporan (summary, sales, top-products) serta antarmuka UI (cards, SVG chart, table, CSV download) di domain C.
- 2026-09-27 - C5: Selesai memodifikasi `GET /admin/stats` dengan query SQL baca-saja, dan mengimplementasi dashboard admin di frontend.
- 2026-09-27 - C6: Memulai penulisan e2e promo `e2e/ec-promo.spec.ts`. Skenario CRUD, Validasi API, Laporan, dan Dashboard sudah ditulis. Namun saat dijalankan, terblokir F0 bug di module checkout (lihat Permintaan Lintas Domain). Sesuai aturan, saya BERHENTI dan tidak menambal domain lain. Task C6 belum bisa ditutup ✅.

## Permintaan lintas-domain
*Format: YYYY-MM-DD - TaskID - BUTUH: ... - ALASAN: ... - MEMBLOKIR: (ya/tidak) - USULAN: ...*

- 2026-09-27 - C6 - BUTUH: Perbaikan `checkout.PriceLines` di `services/api/internal/checkout/pricing.go`. - ALASAN: Query SQL di `pricing.go` baris 33 mengambil `p.category_id`, padahal tabel `products` hanya memiliki `category_slug`. Selain itu field struct hasil map `WeightKg` menggunakan `float64` padahal di DB `weight_kg` bisa `NULL` (harus pointer/null type). Hal ini menyebabkan endpoint `POST /api/v1/coupons/validate` selalu mengembalikan 500 "Gagal menghitung harga barang". - MEMBLOKIR: ya - USULAN: Ubah `p.category_id` menjadi `p.category_slug as category_id`, dan ubah tipe `WeightKg` di struct `Result` menjadi `*float64`.
