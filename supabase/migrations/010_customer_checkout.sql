-- 010_customer_checkout.sql — domain B (docs/rencana/RENCANA-ECOMMERCE-V2.md §5.3)

-- Provinsi (38, kode 2 digit Kemendagri/BPS — agent 0A WAJIB memverifikasi daftar & kode)
CREATE TABLE IF NOT EXISTS provinces (
  code text PRIMARY KEY CHECK (code ~ '^[0-9]{2}$'),
  name text NOT NULL UNIQUE);
INSERT INTO provinces (code, name) VALUES
 ('11','Aceh'),('12','Sumatera Utara'),('13','Sumatera Barat'),('14','Riau'),('15','Jambi'),
 ('16','Sumatera Selatan'),('17','Bengkulu'),('18','Lampung'),('19','Kepulauan Bangka Belitung'),
 ('21','Kepulauan Riau'),('31','DKI Jakarta'),('32','Jawa Barat'),('33','Jawa Tengah'),
 ('34','DI Yogyakarta'),('35','Jawa Timur'),('36','Banten'),('51','Bali'),
 ('52','Nusa Tenggara Barat'),('53','Nusa Tenggara Timur'),('61','Kalimantan Barat'),
 ('62','Kalimantan Tengah'),('63','Kalimantan Selatan'),('64','Kalimantan Timur'),
 ('65','Kalimantan Utara'),('71','Sulawesi Utara'),('72','Sulawesi Tengah'),
 ('73','Sulawesi Selatan'),('74','Sulawesi Tenggara'),('75','Gorontalo'),('76','Sulawesi Barat'),
 ('81','Maluku'),('82','Maluku Utara'),('91','Papua'),('92','Papua Barat'),('93','Papua Selatan'),
 ('94','Papua Tengah'),('95','Papua Pegunungan'),('96','Papua Barat Daya')
ON CONFLICT (code) DO NOTHING;

-- Buku alamat
CREATE TABLE IF NOT EXISTS addresses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label         text NOT NULL DEFAULT 'Rumah' CHECK (char_length(label) BETWEEN 1 AND 40),
  recipient     text NOT NULL CHECK (char_length(recipient) BETWEEN 1 AND 100),
  phone         text NOT NULL CHECK (phone ~ '^(\+62|0)8[0-9]{7,12}$'),
  address_line  text NOT NULL CHECK (char_length(address_line) BETWEEN 5 AND 300),
  district      text,                                   -- kecamatan (opsional)
  city          text NOT NULL,
  province_code text NOT NULL REFERENCES provinces(code),
  postal_code   text NOT NULL CHECK (postal_code ~ '^[0-9]{5}$'),
  notes         text CHECK (notes IS NULL OR char_length(notes) <= 200),
  is_default    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_addresses_one_default ON addresses(user_id) WHERE is_default;
-- Backfill dari profiles (yang provinsinya bisa dicocokkan & format valid saja)
INSERT INTO addresses (user_id, label, recipient, phone, address_line, city, province_code, postal_code, is_default)
SELECT p.id, 'Utama', p.full_name, p.phone, p.address_line, p.city, pr.code, p.postal_code, true
FROM profiles p JOIN provinces pr ON lower(pr.name) = lower(trim(p.province))
WHERE p.address_line IS NOT NULL AND p.full_name IS NOT NULL AND p.city IS NOT NULL
  AND p.phone ~ '^(\+62|0)8[0-9]{7,12}$' AND p.postal_code ~ '^[0-9]{5}$'
  AND NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = p.id);
COMMENT ON COLUMN profiles.address_line IS 'DEPRECATED v2: pakai tabel addresses.';

-- Wishlist
CREATE TABLE IF NOT EXISTS wishlist_items (
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id));
CREATE INDEX IF NOT EXISTS idx_wishlist_product ON wishlist_items(product_id);

-- Keranjang relasional
CREATE TABLE IF NOT EXISTS cart_items (
  cart_id    uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  qty        integer NOT NULL CHECK (qty BETWEEN 1 AND 99),
  added_at   timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cart_id, variant_id));
-- Backfill (dijalankan ulang oleh task B2 saat cutover; idempoten, qty terbaru menang)
INSERT INTO cart_items (cart_id, variant_id, qty)
SELECT c.id, (e->>'variant_id')::uuid, LEAST(GREATEST((e->>'qty')::int, 1), 99)
FROM carts c CROSS JOIN LATERAL jsonb_array_elements(c.items) e
WHERE (e->>'variant_id') ~ '^[0-9a-f-]{36}$'
  AND EXISTS (SELECT 1 FROM product_variants pv WHERE pv.id = (e->>'variant_id')::uuid)
ON CONFLICT (cart_id, variant_id) DO UPDATE SET qty = EXCLUDED.qty, updated_at = now();
COMMENT ON COLUMN carts.items IS 'DEPRECATED v2: sumber kebenaran cart_items. Dihapus di migrasi pembersihan F3.';

-- Ongkir
CREATE TABLE IF NOT EXISTS shipping_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9_]{2,32}$'),
  name_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  position integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS shipping_zone_provinces (
  province_code text PRIMARY KEY REFERENCES provinces(code),   -- 1 provinsi = 1 zona
  zone_id       uuid NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS shipping_methods (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id                    uuid NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE,
  code                       text NOT NULL CHECK (code ~ '^[a-z0-9_]{2,32}$'),
  name_i18n                  jsonb NOT NULL DEFAULT '{}'::jsonb,
  rate_type                  text NOT NULL CHECK (rate_type IN ('flat','per_kg')),
  base_cost                  integer NOT NULL CHECK (base_cost >= 0),
  per_kg_cost                integer NOT NULL DEFAULT 0 CHECK (per_kg_cost >= 0),
  max_weight_kg              numeric(10,2),
  free_shipping_min_subtotal integer CHECK (free_shipping_min_subtotal IS NULL OR free_shipping_min_subtotal > 0),
  eta_min_days               smallint NOT NULL CHECK (eta_min_days >= 0),
  eta_max_days               smallint NOT NULL,
  is_active                  boolean NOT NULL DEFAULT true,
  position                   integer NOT NULL DEFAULT 0,
  UNIQUE (zone_id, code),
  CHECK (eta_max_days >= eta_min_days),
  CHECK (rate_type = 'per_kg' OR per_kg_cost = 0));
ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_shipping_method;
ALTER TABLE orders ADD CONSTRAINT fk_orders_shipping_method
  FOREIGN KEY (shipping_method_id) REFERENCES shipping_methods(id) ON DELETE SET NULL;

-- Seed zona & metode (§5.3.1 — angka contoh, admin bisa ubah). Idempoten via ON CONFLICT.
INSERT INTO shipping_zones (code, name_i18n, position) VALUES
 ('jawa_bali',  '{"id":"Jawa & Bali","en":"Java & Bali"}'::jsonb, 1),
 ('sumatera',   '{"id":"Sumatera","en":"Sumatra"}'::jsonb, 2),
 ('kalimantan', '{"id":"Kalimantan","en":"Kalimantan"}'::jsonb, 3),
 ('sulawesi',   '{"id":"Sulawesi","en":"Sulawesi"}'::jsonb, 4),
 ('timur',      '{"id":"Indonesia Timur","en":"Eastern Indonesia"}'::jsonb, 5)
ON CONFLICT (code) DO NOTHING;

INSERT INTO shipping_zone_provinces (province_code, zone_id)
SELECT v.code, z.id FROM (VALUES
  ('31','jawa_bali'),('32','jawa_bali'),('33','jawa_bali'),('34','jawa_bali'),
  ('35','jawa_bali'),('36','jawa_bali'),('51','jawa_bali'),
  ('11','sumatera'),('12','sumatera'),('13','sumatera'),('14','sumatera'),('15','sumatera'),
  ('16','sumatera'),('17','sumatera'),('18','sumatera'),('19','sumatera'),('21','sumatera'),
  ('61','kalimantan'),('62','kalimantan'),('63','kalimantan'),('64','kalimantan'),('65','kalimantan'),
  ('71','sulawesi'),('72','sulawesi'),('73','sulawesi'),('74','sulawesi'),('75','sulawesi'),('76','sulawesi'),
  ('52','timur'),('53','timur'),('81','timur'),('82','timur'),('91','timur'),('92','timur'),
  ('93','timur'),('94','timur'),('95','timur'),('96','timur')
) AS v(code, zone_code)
JOIN shipping_zones z ON z.code = v.zone_code
ON CONFLICT (province_code) DO NOTHING;

INSERT INTO shipping_methods (zone_id, code, name_i18n, rate_type, base_cost, per_kg_cost,
                               max_weight_kg, free_shipping_min_subtotal, eta_min_days, eta_max_days, position)
SELECT z.id, m.code, m.name_i18n::jsonb, 'per_kg', m.base_cost, m.per_kg_cost,
       m.max_weight_kg, m.free_min, m.eta_min, m.eta_max, m.pos
FROM (VALUES
  ('jawa_bali',  'reguler', '{"id":"Reguler","en":"Regular"}', 40000,  3000, NULL::numeric, 5000000::integer, 3, 5, 1),
  ('jawa_bali',  'kargo',   '{"id":"Kargo","en":"Cargo"}',     100000, 1500, NULL::numeric, NULL::integer,    5, 8, 2),
  ('jawa_bali',  'express', '{"id":"Ekspres","en":"Express"}', 90000,  6000, 30::numeric,   NULL::integer,    1, 2, 3),
  ('sumatera',   'reguler', '{"id":"Reguler","en":"Regular"}', 80000,  6000, NULL::numeric, NULL::integer,    5, 8, 1),
  ('sumatera',   'kargo',   '{"id":"Kargo","en":"Cargo"}',     180000, 3000, NULL::numeric, NULL::integer,    7, 12, 2),
  ('kalimantan', 'reguler', '{"id":"Reguler","en":"Regular"}', 100000, 7000, NULL::numeric, NULL::integer,    6, 9, 1),
  ('kalimantan', 'kargo',   '{"id":"Kargo","en":"Cargo"}',     200000, 3500, NULL::numeric, NULL::integer,    8, 14, 2),
  ('sulawesi',   'reguler', '{"id":"Reguler","en":"Regular"}', 110000, 8000, NULL::numeric, NULL::integer,    6, 10, 1),
  ('sulawesi',   'kargo',   '{"id":"Kargo","en":"Cargo"}',     220000, 4000, NULL::numeric, NULL::integer,    9, 15, 2),
  ('timur',      'reguler', '{"id":"Reguler","en":"Regular"}', 160000, 12000, NULL::numeric, NULL::integer,   8, 14, 1),
  ('timur',      'kargo',   '{"id":"Kargo","en":"Cargo"}',     300000, 6000, NULL::numeric, NULL::integer,   12, 21, 2)
) AS m(zone_code, code, name_i18n, base_cost, per_kg_cost, max_weight_kg, free_min, eta_min, eta_max, pos)
JOIN shipping_zones z ON z.code = m.zone_code
ON CONFLICT (zone_id, code) DO NOTHING;

ALTER TABLE provinces               ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zone_provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_methods        ENABLE ROW LEVEL SECURITY;
