-- 009_catalog_inventory.sql — domain A (docs/rencana/RENCANA-ECOMMERCE-V2.md §5.2)

-- Kategori bertingkat
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS parent_id        uuid REFERENCES categories(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS description_i18n jsonb   NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS image_path       text,
  ADD COLUMN IF NOT EXISTS position         integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active        boolean NOT NULL DEFAULT true;
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_not_self_parent;
ALTER TABLE categories ADD CONSTRAINT categories_not_self_parent CHECK (parent_id IS NULL OR parent_id <> id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- Produk
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS status                 text    NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS short_description_i18n jsonb   NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_featured            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at           timestamptz,
  ADD COLUMN IF NOT EXISTS meta_title_i18n        jsonb   NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS meta_description_i18n  jsonb   NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rating_avg             numeric(3,2) NOT NULL DEFAULT 0,  -- ditulis trigger 012
  ADD COLUMN IF NOT EXISTS rating_count           integer NOT NULL DEFAULT 0,       -- ditulis trigger 012
  ADD COLUMN IF NOT EXISTS total_sales            integer NOT NULL DEFAULT 0;       -- ditulis trigger di bawah
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE products ADD CONSTRAINT products_status_check CHECK (status IN ('draft','published','archived'));
UPDATE products SET published_at = created_at WHERE published_at IS NULL AND status = 'published';
CREATE INDEX IF NOT EXISTS idx_products_status_created ON products(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured;

-- Varian: harga sale terjadwal, berat, ambang stok  ⚠ cek: stock < 0, price <= 0
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS sale_price          integer,
  ADD COLUMN IF NOT EXISTS sale_starts_at      timestamptz,
  ADD COLUMN IF NOT EXISTS sale_ends_at        timestamptz,
  ADD COLUMN IF NOT EXISTS weight_kg           numeric(8,2),   -- NULL = pakai products.weight_kg
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer,        -- NULL = pakai store_settings
  ADD COLUMN IF NOT EXISTS is_active           boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS position            integer NOT NULL DEFAULT 0;
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS product_variants_money_check;
ALTER TABLE product_variants ADD CONSTRAINT product_variants_money_check CHECK (
  price > 0 AND stock >= 0
  AND (sale_price IS NULL OR (sale_price > 0 AND sale_price < price))
  AND (sale_ends_at IS NULL OR sale_starts_at IS NULL OR sale_ends_at > sale_starts_at));

-- Harga efektif: SATU-SATUNYA definisi harga jual. Dipakai katalog, cart, quote, order.
CREATE OR REPLACE FUNCTION kriya_effective_price(p_price integer, p_sale integer,
                                                 p_start timestamptz, p_end timestamptz)
RETURNS integer LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN p_sale IS NOT NULL
               AND (p_start IS NULL OR p_start <= now())
               AND (p_end   IS NULL OR p_end   >  now())
         THEN p_sale ELSE p_price END
$$;

-- Tag
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE, name_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS product_tags (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id     uuid NOT NULL REFERENCES tags(id)     ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id));
CREATE INDEX IF NOT EXISTS idx_product_tags_tag ON product_tags(tag_id);

-- Atribut global (untuk filter)
CREATE TABLE IF NOT EXISTS attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE, name_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_filterable boolean NOT NULL DEFAULT true, position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS attribute_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id uuid NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  slug text NOT NULL, name_i18n jsonb NOT NULL DEFAULT '{}'::jsonb, position integer NOT NULL DEFAULT 0,
  UNIQUE (attribute_id, slug));
CREATE TABLE IF NOT EXISTS product_attribute_terms (
  product_id uuid NOT NULL REFERENCES products(id)        ON DELETE CASCADE,
  term_id    uuid NOT NULL REFERENCES attribute_terms(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, term_id));
CREATE INDEX IF NOT EXISTS idx_pat_term ON product_attribute_terms(term_id);

-- Produk terkait
CREATE TABLE IF NOT EXISTS product_relations (
  product_id         uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  related_product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  relation_type      text NOT NULL CHECK (relation_type IN ('upsell','cross_sell')),
  position           integer NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, related_product_id, relation_type),
  CHECK (product_id <> related_product_id));

-- Ledger stok
CREATE TABLE IF NOT EXISTS stock_movements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id  uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  delta       integer NOT NULL CHECK (delta <> 0),
  stock_after integer NOT NULL CHECK (stock_after >= 0),
  reason      text NOT NULL CHECK (reason IN
              ('initial','order_reserved','order_released','restock','adjustment','return_restock')),
  order_id    uuid REFERENCES orders(id)   ON DELETE SET NULL,
  actor_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON stock_movements(variant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_order   ON stock_movements(order_id) WHERE order_id IS NOT NULL;
INSERT INTO stock_movements (variant_id, delta, stock_after, reason, note)
SELECT pv.id, pv.stock, pv.stock, 'initial', 'backfill v2'
FROM product_variants pv
WHERE pv.stock > 0 AND NOT EXISTS (SELECT 1 FROM stock_movements sm WHERE sm.variant_id = pv.id);

-- total_sales dijaga DB, jadi tidak perlu kode di domain mana pun
CREATE OR REPLACE FUNCTION kriya_sync_total_sales() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'pending_payment' AND NEW.status = 'paid' THEN
    UPDATE products p SET total_sales = p.total_sales + s.qty
    FROM (SELECT product_id, SUM(qty) AS qty FROM order_items
          WHERE order_id = NEW.id AND product_id IS NOT NULL GROUP BY product_id) s
    WHERE p.id = s.product_id;
  ELSIF NEW.status = 'refunded' AND OLD.status IN ('paid','processing','shipped','completed') THEN
    UPDATE products p SET total_sales = GREATEST(p.total_sales - s.qty, 0)
    FROM (SELECT product_id, SUM(qty) AS qty FROM order_items
          WHERE order_id = NEW.id AND product_id IS NOT NULL GROUP BY product_id) s
    WHERE p.id = s.product_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_orders_total_sales ON orders;
CREATE TRIGGER trg_orders_total_sales AFTER UPDATE OF status ON orders
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION kriya_sync_total_sales();

ALTER TABLE tags                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tags            ENABLE ROW LEVEL SECURITY;
ALTER TABLE attributes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribute_terms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attribute_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_relations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements         ENABLE ROW LEVEL SECURITY;
