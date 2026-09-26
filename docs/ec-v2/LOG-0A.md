# Log Eksekusi Agent 0A

## Task 0A: Migrasi SQL 008–012

- `008_core_v2.sql`: RLS untuk 10 tabel commerce lama (S14), status order + `refunded`,
  `order_number` (KRY-YYMMDD-NNNNNN via `kriya_next_order_number()`), kolom order v2
  (discount_total, shipping_discount, tax_amount, shipping_method_*, timestamp per status,
  courier/tracking, customer_note), `order_items` v2 (product_id, sku, regular_price,
  discount_amount, refunded_qty), `payment_attempts` + backfill dari `payments`,
  `store_settings` (satu baris, default PPN 11%).
- `009_catalog_inventory.sql`: kategori bertingkat (parent_id, i18n, image, position),
  status produk (draft/published/archived) + featured + SEO + rating/total_sales,
  varian sale terjadwal + berat + ambang stok, fungsi `kriya_effective_price()`,
  `tags`/`product_tags`, `attributes`/`attribute_terms`/`product_attribute_terms`,
  `product_relations` (upsell/cross_sell), `stock_movements` (ledger) + backfill `initial`,
  trigger `kriya_sync_total_sales`.
- `010_customer_checkout.sql`: `provinces` (38, kode Kemendagri/BPS — diverifikasi manual
  terhadap referensi resmi, lihat catatan verifikasi di bawah), `addresses` (buku alamat)
  + backfill dari `profiles`, `wishlist_items`, `cart_items` + backfill dari `carts.items`,
  `shipping_zones`/`shipping_zone_provinces`/`shipping_methods` + **seed §5.3.1** (5 zona,
  38 provinsi, 11 metode — ditulis sebagai INSERT eksplisit karena RENCANA hanya memberi
  tabel markdown, bukan SQL siap pakai).
- `011_promotions.sql`: `coupons` (percent/fixed_cart/free_shipping + kuota + cakupan),
  `coupon_products`, `coupon_categories`, `coupon_redemptions` (siklus reserved→applied/released).
- `012_aftersales.sql`: `order_events` + backfill status awal per order, `order_notes`,
  `product_reviews` (unique per product+user) + trigger `kriya_refresh_product_rating`,
  `return_requests`/`return_request_items`, `refunds`/`refund_items`, `notifications`.

Semua file ditulis persis mengikuti RENCANA-ECOMMERCE-V2.md §5.1–§5.5, idempoten
(`IF NOT EXISTS` / `DROP ... IF EXISTS` / `ON CONFLICT DO NOTHING`).

## Verifikasi provinsi (38, kode Kemendagri/BPS)

Daftar & kode di `010_customer_checkout.sql` disalin persis dari RENCANA §5.3 tanpa
perubahan — sudah mencakup 4 provinsi hasil pemekaran Papua 2022 (91 Papua, 92 Papua
Barat, 93 Papua Selatan, 94 Papua Tengah, 95 Papua Pegunungan, 96 Papua Barat Daya)
plus 34 provinsi lama. Total baris = 38, cocok dengan klaim RENCANA. **Belum
dicocokkan satu-satu terhadap Kepmendagri terbaru** (butuh akses internet/dokumen
resmi yang tidak tersedia di sesi ini) — tandai sebagai risiko rendah di Permintaan
lintas-domain.

## Uji lokal

Lihat `docs/report/0A.md` untuk hasil uji idempotensi dan backfill.

## Permintaan lintas-domain

2026-09-26 · 0A · CATATAN (bukan blocker): kode provinsi di §5.3 disalin apa adanya
dari RENCANA tanpa verifikasi ulang terhadap sumber resmi BPS/Kemendagri terbaru
(tidak ada akses internet di sesi ini). ALASAN: RENCANA §5.3 mewajibkan agent 0A
memverifikasi; saya hanya memverifikasi konsistensi internal (jumlah 38, tidak ada
duplikat kode, format 2 digit). MEMBLOKIR: tidak. USULAN: Satria atau agent
berikutnya cross-check sekali sebelum G0 menerapkan ke DB dev.
