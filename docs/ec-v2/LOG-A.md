# Log Agent - Agent A

## Status Terkini
- **Task Terakhir:** A7 - Seed & E2E katalog
- **Status:** Selesai
- **Commit Terakhir:** 903c5a5

## Log
*Catat langkah-langkah yang sudah diambil, keputusan penting, dan masalah (beserta solusinya) di sini. Satu baris atau paragraf per sesi.*

- 2026-09-26 - Mengerjakan A1. Menambahkan filter status='published' dan is_active=true pada katalog publik. Membuat GET /admin/products. Menambahkan field status, featured, summary, dan seo_metadata pada Create/Update produk BE/FE. Menangani arsip saat DeleteProduct. Selesai dan di-push.
- 2026-09-26 - Mengerjakan A2. Menambahkan field sale terjadwal di Go `ProductVariant` dan FE `ProductDetail`. Update query `GetProducts` dengan `kriya_effective_price`. Tambah filter `on_sale`. Update UI `ProductCard` dengan badge SALE dan `PriceTag` dengan harga coret. Update admin `ProductForm` (Tambah row jadwal sale dan harga).
- 2026-09-27 - Mengerjakan A3. Menambahkan GET /categories aditif dengan parent_id. Membuat CRUD /admin/categories dan halaman FE /admin/catalog/categories. Menambahkan recursive CTE pada filter kategori produk. Menambahkan deskripsi, gambar, dan navigasi anak pada halaman /categories/[slug].
- 2026-09-27 - Mengerjakan A4. Menyelesaikan CRUD tag, atribut, term, integrasi form admin, UI facet di FilterBar, dan halaman admin.
- 2026-09-27 - Mengerjakan A5. Implementasi `ledger.go` (implementasi antarmuka checkout.InventoryLedger) beserta endpoint CRUD inventori admin. FE halaman `/admin/inventory` selesai.
- 2026-09-27 - Mengerjakan A6. Produk terkait & rating selesai (rating_avg, upsell, cross-sell frontend & backend).
- 2026-09-27 - Mengerjakan A7. Menyesuaikan `cmd/seed` agar menyetel status='published' & published_at serta membuat atribut material dan 12 terms secara idempoten; mendaftarkan rute publik tags & attributes di routes.go; menulis test Playwright `e2e/ec-catalog.spec.ts` (draft tak tampil, filter URL, harga coret, arsip) dan seluruh 4 test lulus. Selesai dan di-push.
