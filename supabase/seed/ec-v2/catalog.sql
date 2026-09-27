-- catalog.sql — Seed demo idempoten domain katalog (F3-A)
-- Prefix: ec-a-* (slug), ECA-* (SKU) sesuai §2.1
-- Idempoten: ON CONFLICT DO NOTHING / DO UPDATE

BEGIN;

-- ============================================================
-- 1. Tags
-- ============================================================
INSERT INTO tags (id, slug, name_i18n) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'ec-a-bestseller',
   '{"en":"Bestseller","id":"Terlaris"}'::jsonb),
  ('a0000000-0000-0000-0000-000000000002', 'ec-a-new-arrival',
   '{"en":"New Arrival","id":"Baru Datang"}'::jsonb),
  ('a0000000-0000-0000-0000-000000000003', 'ec-a-eco-friendly',
   '{"en":"Eco Friendly","id":"Ramah Lingkungan"}'::jsonb),
  ('a0000000-0000-0000-0000-000000000004', 'ec-a-limited-edition',
   '{"en":"Limited Edition","id":"Edisi Terbatas"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 2. Attributes & Terms
-- ============================================================
INSERT INTO attributes (id, slug, name_i18n, is_filterable, position) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'ec-a-style',
   '{"en":"Style","id":"Gaya"}'::jsonb, true, 1),
  ('a1000000-0000-0000-0000-000000000002', 'ec-a-finish',
   '{"en":"Finish","id":"Finishing"}'::jsonb, true, 2)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO attribute_terms (id, attribute_id, slug, name_i18n, position) VALUES
  ('a2000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000001', 'minimalis',
   '{"en":"Minimalist","id":"Minimalis"}'::jsonb, 0),
  ('a2000000-0000-0000-0000-000000000002',
   'a1000000-0000-0000-0000-000000000001', 'industrial',
   '{"en":"Industrial","id":"Industrial"}'::jsonb, 1),
  ('a2000000-0000-0000-0000-000000000003',
   'a1000000-0000-0000-0000-000000000001', 'scandinavian',
   '{"en":"Scandinavian","id":"Skandinavia"}'::jsonb, 2),
  ('a2000000-0000-0000-0000-000000000004',
   'a1000000-0000-0000-0000-000000000002', 'matte',
   '{"en":"Matte","id":"Matte"}'::jsonb, 0),
  ('a2000000-0000-0000-0000-000000000005',
   'a1000000-0000-0000-0000-000000000002', 'glossy',
   '{"en":"Glossy","id":"Glossy"}'::jsonb, 1),
  ('a2000000-0000-0000-0000-000000000006',
   'a1000000-0000-0000-0000-000000000002', 'natural-oil',
   '{"en":"Natural Oil","id":"Minyak Alami"}'::jsonb, 2)
ON CONFLICT (attribute_id, slug) DO NOTHING;

-- ============================================================
-- 3. Products (5 produk — 3 with scheduled sale pricing)
-- ============================================================

-- Product 1: Meja Kerja Minimalis (sale aktif sekarang)
INSERT INTO products (
  id, slug, name, name_i18n, category_slug, description,
  description_i18n, materials, materials_i18n, dimensions,
  weight_kg, has_assembly_guide, status, is_featured,
  short_description_i18n, published_at
) VALUES (
  'a3000000-0000-0000-0000-000000000001',
  'ec-a-meja-kerja-minimalis',
  'Meja Kerja Minimalis',
  '{"en":"Minimalist Work Desk","id":"Meja Kerja Minimalis"}'::jsonb,
  'workspace',
  'Meja kerja ringkas dengan bahan kayu pinus solid.',
  '{"en":"Compact work desk made from solid pine wood.","id":"Meja kerja ringkas dengan bahan kayu pinus solid."}'::jsonb,
  '["pine wood"]'::jsonb,
  '{"en":["pine wood"],"id":["kayu pinus"]}'::jsonb,
  '{"width_cm":120,"depth_cm":60,"height_cm":75}'::jsonb,
  12.5, true, 'published', true,
  '{"en":"Compact pine desk for small spaces","id":"Meja pinus ringkas untuk ruang kecil"}'::jsonb,
  NOW() - INTERVAL '7 days'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  name_i18n = EXCLUDED.name_i18n,
  status = EXCLUDED.status,
  is_featured = EXCLUDED.is_featured,
  published_at = EXCLUDED.published_at;

-- Product 2: Sofa Ruang Tamu (sale terjadwal: mulai kemarin, selesai minggu depan)
INSERT INTO products (
  id, slug, name, name_i18n, category_slug, description,
  description_i18n, materials, materials_i18n, dimensions,
  weight_kg, has_assembly_guide, status, is_featured,
  short_description_i18n, published_at
) VALUES (
  'a3000000-0000-0000-0000-000000000002',
  'ec-a-sofa-ruang-tamu',
  'Sofa Ruang Tamu',
  '{"en":"Living Room Sofa","id":"Sofa Ruang Tamu"}'::jsonb,
  'living-room',
  'Sofa empuk tiga dudukan dengan busa premium.',
  '{"en":"Three-seat sofa with premium foam cushion.","id":"Sofa empuk tiga dudukan dengan busa premium."}'::jsonb,
  '["polyester fabric","foam"]'::jsonb,
  '{"en":["polyester fabric","foam"],"id":["kain poliester","busa"]}'::jsonb,
  '{"width_cm":200,"depth_cm":85,"height_cm":80}'::jsonb,
  28.0, false, 'published', true,
  '{"en":"Comfortable three-seat sofa","id":"Sofa tiga dudukan nyaman"}'::jsonb,
  NOW() - INTERVAL '14 days'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  name_i18n = EXCLUDED.name_i18n,
  status = EXCLUDED.status,
  is_featured = EXCLUDED.is_featured,
  published_at = EXCLUDED.published_at;

-- Product 3: Rak Buku Industrial (sale terjadwal: mulai besok, selesai 2 minggu)
INSERT INTO products (
  id, slug, name, name_i18n, category_slug, description,
  description_i18n, materials, materials_i18n, dimensions,
  weight_kg, has_assembly_guide, status, is_featured,
  short_description_i18n, published_at
) VALUES (
  'a3000000-0000-0000-0000-000000000003',
  'ec-a-rak-buku-industrial',
  'Rak Buku Industrial',
  '{"en":"Industrial Bookshelf","id":"Rak Buku Industrial"}'::jsonb,
  'storage',
  'Rak buku gaya industrial dengan rangka besi dan papan kayu.',
  '{"en":"Industrial-style bookshelf with iron frame and wood shelves.","id":"Rak buku gaya industrial dengan rangka besi dan papan kayu."}'::jsonb,
  '["iron","pine wood"]'::jsonb,
  '{"en":["iron","pine wood"],"id":["besi","kayu pinus"]}'::jsonb,
  '{"width_cm":80,"depth_cm":30,"height_cm":180}'::jsonb,
  18.0, true, 'published', false,
  '{"en":"Industrial iron-wood bookshelf","id":"Rak buku besi-kayu industrial"}'::jsonb,
  NOW() - INTERVAL '3 days'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  name_i18n = EXCLUDED.name_i18n,
  status = EXCLUDED.status,
  published_at = EXCLUDED.published_at;

-- Product 4: Lampu Gantung Skandinavia (tanpa sale)
INSERT INTO products (
  id, slug, name, name_i18n, category_slug, description,
  description_i18n, materials, materials_i18n, dimensions,
  weight_kg, has_assembly_guide, status, is_featured,
  short_description_i18n, published_at
) VALUES (
  'a3000000-0000-0000-0000-000000000004',
  'ec-a-lampu-gantung-skandinavia',
  'Lampu Gantung Skandinavia',
  '{"en":"Scandinavian Pendant Lamp","id":"Lampu Gantung Skandinavia"}'::jsonb,
  'lighting',
  'Lampu gantung desain skandinavia dengan material kayu dan kain.',
  '{"en":"Scandinavian pendant lamp crafted from wood and linen.","id":"Lampu gantung desain skandinavia dengan material kayu dan kain."}'::jsonb,
  '["birch wood","linen"]'::jsonb,
  '{"en":["birch wood","linen"],"id":["kayu birch","linen"]}'::jsonb,
  '{"width_cm":40,"depth_cm":40,"height_cm":30}'::jsonb,
  2.0, false, 'published', false,
  '{"en":"Wood and linen pendant lamp","id":"Lampu gantung kayu dan linen"}'::jsonb,
  NOW() - INTERVAL '5 days'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  name_i18n = EXCLUDED.name_i18n,
  status = EXCLUDED.status,
  published_at = EXCLUDED.published_at;

-- Product 5: Meja Makan Keluarga (sale aktif, harga spesial)
INSERT INTO products (
  id, slug, name, name_i18n, category_slug, description,
  description_i18n, materials, materials_i18n, dimensions,
  weight_kg, has_assembly_guide, status, is_featured,
  short_description_i18n, published_at
) VALUES (
  'a3000000-0000-0000-0000-000000000005',
  'ec-a-meja-makan-keluarga',
  'Meja Makan Keluarga',
  '{"en":"Family Dining Table","id":"Meja Makan Keluarga"}'::jsonb,
  'dining-room',
  'Meja makan besar untuk 6 orang, bahan kayu jati pilihan.',
  '{"en":"Large dining table for 6, made from select teak wood.","id":"Meja makan besar untuk 6 orang, bahan kayu jati pilihan."}'::jsonb,
  '["teak wood"]'::jsonb,
  '{"en":["teak wood"],"id":["kayu jati"]}'::jsonb,
  '{"width_cm":180,"depth_cm":90,"height_cm":75}'::jsonb,
  35.0, true, 'published', true,
  '{"en":"Teak dining table for 6","id":"Meja makan jati untuk 6 orang"}'::jsonb,
  NOW() - INTERVAL '10 days'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  name_i18n = EXCLUDED.name_i18n,
  status = EXCLUDED.status,
  is_featured = EXCLUDED.is_featured,
  published_at = EXCLUDED.published_at;

-- ============================================================
-- 4. Variants (with scheduled sale pricing on 3 products)
-- ============================================================

-- Product 1 variants (sale aktif: kemarin s/d 7 hari)
INSERT INTO product_variants (
  id, product_id, sku, color, color_i18n, price,
  sale_price, sale_starts_at, sale_ends_at,
  stock, is_active, position
) VALUES
  ('a4000000-0000-0000-0000-000000000001',
   'a3000000-0000-0000-0000-000000000001', 'ECA-MKM-NAT', 'natural',
   '{"en":"Natural","id":"Natural"}'::jsonb,
   1500000, 1200000,
   NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 days',
   15, true, 0),
  ('a4000000-0000-0000-0000-000000000002',
   'a3000000-0000-0000-0000-000000000001', 'ECA-MKM-WAL', 'walnut',
   '{"en":"Walnut","id":"Walnut"}'::jsonb,
   1650000, NULL, NULL, NULL,
   10, true, 1)
ON CONFLICT (sku) DO UPDATE SET
  price = EXCLUDED.price,
  sale_price = EXCLUDED.sale_price,
  sale_starts_at = EXCLUDED.sale_starts_at,
  sale_ends_at = EXCLUDED.sale_ends_at,
  stock = EXCLUDED.stock,
  is_active = EXCLUDED.is_active;

-- Product 2 variants (sale aktif: kemarin s/d minggu depan)
INSERT INTO product_variants (
  id, product_id, sku, color, color_i18n, price,
  sale_price, sale_starts_at, sale_ends_at,
  stock, is_active, position
) VALUES
  ('a4000000-0000-0000-0000-000000000003',
   'a3000000-0000-0000-0000-000000000002', 'ECA-SRT-GRY', 'grey',
   '{"en":"Grey","id":"Abu-abu"}'::jsonb,
   3500000, 2800000,
   NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 days',
   8, true, 0),
  ('a4000000-0000-0000-0000-000000000004',
   'a3000000-0000-0000-0000-000000000002', 'ECA-SRT-BLU', 'navy blue',
   '{"en":"Navy Blue","id":"Biru Dongker"}'::jsonb,
   3500000, 2800000,
   NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 days',
   5, true, 1)
ON CONFLICT (sku) DO UPDATE SET
  price = EXCLUDED.price,
  sale_price = EXCLUDED.sale_price,
  sale_starts_at = EXCLUDED.sale_starts_at,
  sale_ends_at = EXCLUDED.sale_ends_at,
  stock = EXCLUDED.stock,
  is_active = EXCLUDED.is_active;

-- Product 3 variants (sale terjadwal: besok s/d 2 minggu)
INSERT INTO product_variants (
  id, product_id, sku, color, color_i18n, price,
  sale_price, sale_starts_at, sale_ends_at,
  stock, is_active, position
) VALUES
  ('a4000000-0000-0000-0000-000000000005',
   'a3000000-0000-0000-0000-000000000003', 'ECA-RBI-BLK', 'black',
   '{"en":"Black","id":"Hitam"}'::jsonb,
   2200000, 1800000,
   NOW() + INTERVAL '1 day', NOW() + INTERVAL '14 days',
   12, true, 0)
ON CONFLICT (sku) DO UPDATE SET
  price = EXCLUDED.price,
  sale_price = EXCLUDED.sale_price,
  sale_starts_at = EXCLUDED.sale_starts_at,
  sale_ends_at = EXCLUDED.sale_ends_at,
  stock = EXCLUDED.stock,
  is_active = EXCLUDED.is_active;

-- Product 4 variants (tanpa sale)
INSERT INTO product_variants (
  id, product_id, sku, color, color_i18n, price,
  stock, is_active, position
) VALUES
  ('a4000000-0000-0000-0000-000000000006',
   'a3000000-0000-0000-0000-000000000004', 'ECA-LGS-WHT', 'white',
   '{"en":"White","id":"Putih"}'::jsonb,
   850000, 20, true, 0),
  ('a4000000-0000-0000-0000-000000000007',
   'a3000000-0000-0000-0000-000000000004', 'ECA-LGS-ASH', 'ash',
   '{"en":"Ash","id":"Abu"}'::jsonb,
   900000, 14, true, 1)
ON CONFLICT (sku) DO UPDATE SET
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  is_active = EXCLUDED.is_active;

-- Product 5 variants (sale aktif)
INSERT INTO product_variants (
  id, product_id, sku, color, color_i18n, price,
  sale_price, sale_starts_at, sale_ends_at,
  stock, is_active, position
) VALUES
  ('a4000000-0000-0000-0000-000000000008',
   'a3000000-0000-0000-0000-000000000005', 'ECA-MMK-TEK', 'teak',
   '{"en":"Teak","id":"Jati"}'::jsonb,
   5500000, 4400000,
   NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days',
   6, true, 0)
ON CONFLICT (sku) DO UPDATE SET
  price = EXCLUDED.price,
  sale_price = EXCLUDED.sale_price,
  sale_starts_at = EXCLUDED.sale_starts_at,
  sale_ends_at = EXCLUDED.sale_ends_at,
  stock = EXCLUDED.stock,
  is_active = EXCLUDED.is_active;

-- ============================================================
-- 5. Product Images
-- ============================================================
INSERT INTO product_images (id, product_id, storage_path, alt,
  alt_i18n, is_primary) VALUES
  ('a5000000-0000-0000-0000-000000000001',
   'a3000000-0000-0000-0000-000000000001',
   'products/taru-work-desk-1.jpg', 'Minimalist Work Desk',
   '{"en":"Minimalist Work Desk","id":"Meja Kerja Minimalis"}'::jsonb, true),
  ('a5000000-0000-0000-0000-000000000002',
   'a3000000-0000-0000-0000-000000000002',
   'products/tamu-sofa-1.jpg', 'Living Room Sofa',
   '{"en":"Living Room Sofa","id":"Sofa Ruang Tamu"}'::jsonb, true),
  ('a5000000-0000-0000-0000-000000000003',
   'a3000000-0000-0000-0000-000000000003',
   'products/wira-bookshelf-1.jpg', 'Industrial Bookshelf',
   '{"en":"Industrial Bookshelf","id":"Rak Buku Industrial"}'::jsonb, true),
  ('a5000000-0000-0000-0000-000000000004',
   'a3000000-0000-0000-0000-000000000004',
   'products/cahaya-pendant-1.jpg', 'Scandinavian Pendant Lamp',
   '{"en":"Scandinavian Pendant Lamp","id":"Lampu Gantung Skandinavia"}'::jsonb, true),
  ('a5000000-0000-0000-0000-000000000005',
   'a3000000-0000-0000-0000-000000000005',
   'products/santap-dining-1.jpg', 'Family Dining Table',
   '{"en":"Family Dining Table","id":"Meja Makan Keluarga"}'::jsonb, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. Product Tags (many-to-many)
-- ============================================================
INSERT INTO product_tags (product_id, tag_id) VALUES
  ('a3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  ('a3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003'),
  ('a3000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001'),
  ('a3000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002'),
  ('a3000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003'),
  ('a3000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002'),
  ('a3000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003'),
  ('a3000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004')
ON CONFLICT (product_id, tag_id) DO NOTHING;

-- ============================================================
-- 7. Product Attribute Terms (many-to-many)
-- ============================================================
INSERT INTO product_attribute_terms (product_id, term_id) VALUES
  ('a3000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001'),
  ('a3000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000006'),
  ('a3000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001'),
  ('a3000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000004'),
  ('a3000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000002'),
  ('a3000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000004'),
  ('a3000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000003'),
  ('a3000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000006'),
  ('a3000000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000001'),
  ('a3000000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000005')
ON CONFLICT (product_id, term_id) DO NOTHING;

-- ============================================================
-- 8. Product Relations (upsell / cross_sell)
-- ============================================================
INSERT INTO product_relations (product_id, related_product_id, relation_type, position) VALUES
  ('a3000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000005', 'upsell', 0),
  ('a3000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000004', 'cross_sell', 0),
  ('a3000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000004', 'cross_sell', 0),
  ('a3000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000003', 'cross_sell', 1),
  ('a3000000-0000-0000-0000-000000000005', 'a3000000-0000-0000-0000-000000000001', 'upsell', 0),
  ('a3000000-0000-0000-0000-000000000005', 'a3000000-0000-0000-0000-000000000002', 'cross_sell', 0)
ON CONFLICT (product_id, related_product_id, relation_type) DO NOTHING;

-- ============================================================
-- 9. Stock Movements (initial stock entries)
-- ============================================================
INSERT INTO stock_movements (id, variant_id, delta, stock_after, reason) VALUES
  ('a6000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000001', 15, 15, 'initial'),
  ('a6000000-0000-0000-0000-000000000002', 'a4000000-0000-0000-0000-000000000002', 10, 10, 'initial'),
  ('a6000000-0000-0000-0000-000000000003', 'a4000000-0000-0000-0000-000000000003',  8,  8, 'initial'),
  ('a6000000-0000-0000-0000-000000000004', 'a4000000-0000-0000-0000-000000000004',  5,  5, 'initial'),
  ('a6000000-0000-0000-0000-000000000005', 'a4000000-0000-0000-0000-000000000005', 12, 12, 'initial'),
  ('a6000000-0000-0000-0000-000000000006', 'a4000000-0000-0000-0000-000000000006', 20, 20, 'initial'),
  ('a6000000-0000-0000-0000-000000000007', 'a4000000-0000-0000-0000-000000000007', 14, 14, 'initial'),
  ('a6000000-0000-0000-0000-000000000008', 'a4000000-0000-0000-0000-000000000008',  6,  6, 'initial')
ON CONFLICT (id) DO NOTHING;

COMMIT;
