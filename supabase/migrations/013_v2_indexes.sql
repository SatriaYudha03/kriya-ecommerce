-- 013_v2_indexes.sql — Index optimasi performa F3 (Domain A, B, C) & pembersihan skema v2
-- Rujukan: docs/rencana/EKSEKUSI-PARALEL-V2.md §9.2, LOG-A, LOG-B, LOG-C

-- ============================================================================
-- Domain A (Katalog): 7 index hasil EXPLAIN ANALYZE
-- ============================================================================

-- 1. Partial index untuk listing produk publik per kategori
CREATE INDEX IF NOT EXISTS idx_products_status_category
  ON products(status, category_slug)
  WHERE status = 'published';

-- 2. Index varian aktif untuk join & price subquery
CREATE INDEX IF NOT EXISTS idx_product_variants_product_active
  ON product_variants(product_id, is_active)
  WHERE is_active = true;

-- 3. Covering index untuk sort price_asc/desc dengan kriya_effective_price
CREATE INDEX IF NOT EXISTS idx_product_variants_price_calc
  ON product_variants(product_id, price, sale_price, sale_starts_at, sale_ends_at)
  WHERE is_active = true;

-- 4. Partial index homepage featured (update/replace narrower predicate)
DROP INDEX IF EXISTS idx_products_featured;
CREATE INDEX IF NOT EXISTS idx_products_featured
  ON products(is_featured)
  WHERE is_featured = true AND status = 'published';

-- 5. Composite index untuk sorting best_selling & rating
CREATE INDEX IF NOT EXISTS idx_products_sales_rating
  ON products(total_sales DESC, rating_avg DESC, rating_count DESC, created_at DESC);

-- 6. Lookup index untuk facet counts (GROUP BY term_id + JOIN products)
CREATE INDEX IF NOT EXISTS idx_product_attribute_terms_lookup
  ON product_attribute_terms(product_id, term_id);

-- 7. Partial index low stock alert untuk inventori admin
CREATE INDEX IF NOT EXISTS idx_product_variants_low_stock
  ON product_variants(stock, low_stock_threshold, is_active)
  WHERE stock <= low_stock_threshold AND is_active = true;

-- ============================================================================
-- Domain B (Customer & Checkout): 3 index hasil EXPLAIN ANALYZE
-- ============================================================================

-- 8. Composite index buku alamat (filter user, order default & terbaru)
CREATE INDEX IF NOT EXISTS idx_addresses_user_default
  ON addresses(user_id, is_default DESC, created_at DESC);

-- 9. Index item keranjang urut penambahan
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_added
  ON cart_items(cart_id, added_at ASC);

-- 10. Partial index metode pengiriman aktif per zona
CREATE INDEX IF NOT EXISTS idx_shipping_methods_zone_pos
  ON shipping_methods(zone_id, position ASC)
  WHERE is_active = true;

-- ============================================================================
-- Domain C (Promo & Laporan): 3 index hasil EXPLAIN ANALYZE
-- ============================================================================

-- 11. Partial index kupon publik aktif urut terbaru
CREATE INDEX IF NOT EXISTS idx_coupons_public_active
  ON coupons(created_at DESC)
  WHERE is_public = true AND is_active = true;

-- 12. Partial composite index pesanan lunas untuk agregasi laporan & dashboard
CREATE INDEX IF NOT EXISTS idx_orders_paid_status
  ON orders(paid_at, status)
  WHERE paid_at IS NOT NULL;

-- 13. Composite index validasi batas pemakaian kupon per user (index-only scan)
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user_status
  ON coupon_redemptions(user_id, coupon_id, status);

-- ============================================================================
-- Pembersihan Skema v2: Drop kolom usang carts.items
-- Sumber kebenaran sudah beralih 100% ke tabel relasional cart_items sejak B2
-- ============================================================================

ALTER TABLE carts DROP COLUMN IF EXISTS items;
