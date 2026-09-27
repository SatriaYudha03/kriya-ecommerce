# Log Agent - Agent A

## Status Terkini
- **Task Terakhir:** F3-A - Seed/audit katalog
- **Status:** Selesai
- **Commit Terakhir:** 61737ac

## Log
*Catat langkah-langkah yang sudah diambil, keputusan penting, dan masalah (beserta solusinya) di sini. Satu baris atau paragraf per sesi.*

- 2026-09-26 - Mengerjakan A1. Menambahkan filter status='published' dan is_active=true pada katalog publik. Membuat GET /admin/products. Menambahkan field status, featured, summary, dan seo_metadata pada Create/Update produk BE/FE. Menangani arsip saat DeleteProduct. Selesai dan di-push.
- 2026-09-26 - Mengerjakan A2. Menambahkan field sale terjadwal di Go `ProductVariant` dan FE `ProductDetail`. Update query `GetProducts` dengan `kriya_effective_price`. Tambah filter `on_sale`. Update UI `ProductCard` dengan badge SALE dan `PriceTag` dengan harga coret. Update admin `ProductForm` (Tambah row jadwal sale dan harga).
- 2026-09-27 - Mengerjakan A3. Menambahkan GET /categories aditif dengan parent_id. Membuat CRUD /admin/categories dan halaman FE /admin/catalog/categories. Menambahkan recursive CTE pada filter kategori produk. Menambahkan deskripsi, gambar, dan navigasi anak pada halaman /categories/[slug].
- 2026-09-27 - Mengerjakan A4. Menyelesaikan CRUD tag, atribut, term, integrasi form admin, UI facet di FilterBar, dan halaman admin.
- 2026-09-27 - Mengerjakan A5. Implementasi `ledger.go` (implementasi antarmuka checkout.InventoryLedger) beserta endpoint CRUD inventori admin. FE halaman `/admin/inventory` selesai.
- 2026-09-27 - Mengerjakan A6. Produk terkait & rating selesai (rating_avg, upsell, cross-sell frontend & backend).
- 2026-09-27 - Mengerjakan A7. Menyesuaikan `cmd/seed` agar menyetel status='published' & published_at serta membuat atribut material dan 12 terms secara idempoten; mendaftarkan rute publik tags & attributes di routes.go; menulis test Playwright `e2e/ec-catalog.spec.ts` (draft tak tampil, filter URL, harga coret, arsip) dan seluruh 4 test lulus. Selesai dan di-push.
- 2026-09-27 - Mengerjakan F3-A. Membuat `supabase/seed/ec-v2/catalog.sql` idempoten (5 produk demo, 4 tag, 2 atribut dengan 6 term, relasi upsell/cross-sell, sale terjadwal pada 3 produk, initial stock movements). Audit i18n: menambahkan ~180 key baru di `catalog.ts` (id/en), memperbaiki 12+ komponen domain katalog (product-detail-view, product-card, variant-selector, filter-bar, category-form, queries.ts, 5 halaman admin) — mayoritas hardcoded text kini pakai `t()`. Audit a11y: category-form ditambah `role="dialog"`, `aria-modal`, `aria-labelledby`, close button `aria-label`; admin pages ditambah `aria-label` pada search input & action button.

## Permintaan lintas-domain

### Usulan Index (EXPLAIN ANALYZE query terpanas katalog)

**Query 1: GetProducts (repository.go:93) — Listing dengan filter**
```sql
-- Query ini: recursive CTE kategori + WHERE 8 dimensi + JOIN variants + kriya_effective_price
-- Hot path: /api/v1/products?category=X&attrs=Y&sort=price_asc
-- Bottleneck: CTE kategori + subquery sort price_asc/price_desc (line 156-158)
```
**Usulan index:**
1. `CREATE INDEX idx_categories_parent_id ON categories(parent_id);` — sudah ada (009)
2. `CREATE INDEX idx_products_status_category ON products(status, category_slug) WHERE status = 'published';` — partial index untuk filter publik
3. `CREATE INDEX idx_product_variants_product_active ON product_variants(product_id, is_active) WHERE is_active = true;` — untuk join variants + price subquery
4. `CREATE INDEX idx_product_variants_price_calc ON product_variants(product_id, price, sale_price, sale_starts_at, sale_ends_at) WHERE is_active = true;` — covering index untuk sort price_asc/desc dengan `kriya_effective_price`
5. `CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = true AND status = 'published';` — partial index homepage featured
6. `CREATE INDEX idx_products_sales_rating ON products(total_sales DESC, rating_avg DESC, rating_count DESC, created_at DESC);` — composite untuk sort best_selling & rating

**Query 2: GetProductCountsForTerms (repository.go:260) — Facet counts**
```sql
-- Query ini: JOIN product_attribute_terms + products + CTE kategori, GROUP BY term_id
-- Hot path: FilterBar facet UI (atribut dengan product_count per term)
```
**Usulan index:**
7. `CREATE INDEX idx_product_attribute_terms_lookup ON product_attribute_terms(product_id, term_id);` — untuk GROUP BY term_id + JOIN products

**Query 3: GetInventory (admin_repo.go:313) — Admin inventory low stock**
```sql
-- Query ini: JOIN product_variants + products, filter low_stock_threshold
-- Hot path: /admin/inventory?low_stock_only=true
```
**Usulan index:**
8. `CREATE INDEX idx_product_variants_low_stock ON product_variants(stock, low_stock_threshold, is_active) WHERE stock <= low_stock_threshold AND is_active = true;` — partial index low stock alert

**Catatan:** Semua usulan di atas adalah PERMINTAAN ke F3-Z (Claude/Satria) untuk ditambahkan di migrasi 013. Tidak dieksekusi sendiri oleh Agent A (R5).
