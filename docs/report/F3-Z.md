# Report F3-Z: migrasi 013 dan pembaruan dokumen resmi v2

**Agent:** Claude (Lead Integrator / Reviewer)
**Tanggal:** 2026-09-27
**Branch:** `main`
**Commit SHA terakhir:** `6836324`
**Status:** selesai

## Ringkasan Pekerjaan
1. **Migrasi `supabase/migrations/013_v2_indexes.sql`:**
   - 7 index Domain A (Katalog): `idx_products_status_category`, `idx_product_variants_product_active`, `idx_product_variants_price_calc`, `idx_products_featured`, `idx_products_sales_rating`, `idx_product_attribute_terms_lookup`, `idx_product_variants_low_stock`.
   - 3 index Domain B (Customer): `idx_addresses_user_default`, `idx_cart_items_cart_added`, `idx_shipping_methods_zone_pos`.
   - 3 index Domain C (Promo): `idx_coupons_public_active`, `idx_orders_paid_status`, `idx_coupon_redemptions_user_status`.
   - Pembersihan skema v2: `ALTER TABLE carts DROP COLUMN IF EXISTS items;` (sumber kebenaran beralih 100% ke `cart_items` sejak B2).
   - Penyesuaian `Cart` struct pada `services/api/internal/customer/cart_repo.go` guna menghapus mapping field `items` yang telah di-drop.
2. **Sinkronisasi Dokumen Resmi & Kontrak:**
   - `docs/agents/KRIYA-MASTER.md`: Pembaruan Bagian 6 (Kontrak API v2 modular lengkap: Katalog, Customer, Promo, Aftersales, Checkout v2, AI, Webhook) dan Bagian 7 (Skema database migrasi 001 s.d. 013 dan pemetaan kepemilikan tabel per domain).
   - `docs/agents/AGENT-BE.md`: Dokumentasi struktur package Go modular `services/api/internal/{catalog,customer,promo,aftersales,checkout,orderflow,httpx,platform}`.
   - `docs/agents/AGENT-FE.md`: Dokumentasi modul FE `apps/web/lib/{catalog,customer,promo,aftersales,checkout}` serta komponen domain terkait di `components/kriya/<domain>/`.
   - `README.md`: Penyelarasan ringkasan arsitektur sistem, rute endpoint aktif v2, dan petunjuk migrasi database `001` s.d. `013`.
3. **Audit Barrel FE Usang:**
   - Evaluasi file `apps/web/lib/{api,types,queries,admin-queries}.ts`. Sebanyak 26 file (layout store, header, footer, auth provider) masih memanfaatkan re-export façade ini dengan aman. Barrel dipertahankan untuk backward compatibility tanpa duplikasi logika.

## DoD §2.2 — output asli
1. **Go build/vet/test:**
```
?   	github.com/kriya-commerce/api/cmd/api	[no test files]
?   	github.com/kriya-commerce/api/cmd/seed	[no test files]
?   	github.com/kriya-commerce/api/internal/aftersales	[no test files]
?   	github.com/kriya-commerce/api/internal/catalog	[no test files]
ok  	github.com/kriya-commerce/api/internal/checkout	0.188s
?   	github.com/kriya-commerce/api/internal/config	[no test files]
ok  	github.com/kriya-commerce/api/internal/customer	0.200s
?   	github.com/kriya-commerce/api/internal/db	[no test files]
?   	github.com/kriya-commerce/api/internal/httpx	[no test files]
ok  	github.com/kriya-commerce/api/internal/middleware	0.207s
?   	github.com/kriya-commerce/api/internal/orderflow	[no test files]
?   	github.com/kriya-commerce/api/internal/platform	[no test files]
ok  	github.com/kriya-commerce/api/internal/promo	0.187s
ok  	github.com/kriya-commerce/api/internal/service	0.724s
?   	github.com/kriya-commerce/api/internal/storage	[no test files]
```

2. **tsc/eslint/next build & E2E tsc:**
- `npx tsc --noEmit`: 0 error
- `npm run lint`:
```
✖ 4 problems (0 errors, 4 warnings)
```
- `npm run build`:
```
▲ Next.js 16.2.10 (Turbopack)
✓ Compiled successfully in 11.8s
✓ Generating static pages using 11 workers (31/31) in 7.6s
```
- `./apps/web/node_modules/.bin/tsc --noEmit -p e2e/tsconfig.json`: 0 error

3. **check-ownership.sh:**
N/A — task integrator/lead F3-Z (pembaruan migrasi 013, clean-up schema, dan sinkronisasi master docs).

4. **any-check.sh:**
```
No changed files to check for any/interface{}.
```

5. **curl endpoint yang disentuh:**
N/A — perubahan skema database DDL dan dokumentasi arsitektur.

6. **Fixtures diperbarui:**
N/A — fixtures domain telah dimutakhirkan pada fase F1/F2.

7. **i18n EN+ID:**
N/A — dokumentasi teknis di `docs/` dan `README.md`.

8. **E2E spec:**
Typecheck TypeScript untuk semua spec E2E (`e2e/tsconfig.json`) lulus 0 error.

9. **Data uji dibersihkan:**
Ya, tidak ada data uji sisa.

## Permintaan lintas-domain
Tidak ada.

## Next
Program F3-Z selesai. Lanjut ke Gerbang G3 (Rilis dan pengujian akhir).
