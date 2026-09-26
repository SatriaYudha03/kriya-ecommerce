-- 008_core_v2.sql — Fondasi e-commerce v2 (docs/rencana/RENCANA-ECOMMERCE-V2.md §5.1)

-- (a) RLS untuk tabel commerce lama (S14). Verifikasi dulu status RLS via MCP/advisor.
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images    ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_guides   ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments          ENABLE ROW LEVEL SECURITY;

-- (b) Status order resmi + 'refunded'  ⚠ cek: SELECT DISTINCT status FROM orders;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN
  ('pending_payment','paid','processing','shipped','completed','cancelled','expired','refunded'));

-- (c) Nomor order manusiawi
CREATE SEQUENCE IF NOT EXISTS order_number_seq;
CREATE OR REPLACE FUNCTION kriya_next_order_number() RETURNS text
LANGUAGE sql VOLATILE AS $$
  SELECT 'KRY-' || to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYMMDD') || '-'
         || lpad(nextval('order_number_seq')::text, 6, '0')
$$;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number text;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT id, created_at FROM orders WHERE order_number IS NULL ORDER BY created_at LOOP
    UPDATE orders SET order_number = 'KRY-' || to_char(r.created_at AT TIME ZONE 'Asia/Jakarta','YYMMDD')
      || '-' || lpad(nextval('order_number_seq')::text, 6, '0') WHERE id = r.id;
  END LOOP;
END $$;
ALTER TABLE orders ALTER COLUMN order_number SET DEFAULT kriya_next_order_number();
ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_order_number ON orders(order_number);

-- (d) Kolom order v2
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS discount_total        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_discount     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount            integer NOT NULL DEFAULT 0,  -- PPN yang sudah TERMASUK di total
  ADD COLUMN IF NOT EXISTS shipping_method_id    uuid,                          -- FK ditambah di 010
  ADD COLUMN IF NOT EXISTS shipping_method_code  text,
  ADD COLUMN IF NOT EXISTS shipping_method_name  text,                          -- snapshot sesuai locale saat checkout
  ADD COLUMN IF NOT EXISTS shipping_eta_min_days smallint,
  ADD COLUMN IF NOT EXISTS shipping_eta_max_days smallint,
  ADD COLUMN IF NOT EXISTS total_weight_kg       numeric(10,2),
  ADD COLUMN IF NOT EXISTS customer_note         text,
  ADD COLUMN IF NOT EXISTS courier               text,
  ADD COLUMN IF NOT EXISTS tracking_number       text,
  ADD COLUMN IF NOT EXISTS paid_at               timestamptz,
  ADD COLUMN IF NOT EXISTS shipped_at            timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at          timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at          timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason         text;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_money_check;
ALTER TABLE orders ADD CONSTRAINT orders_money_check CHECK (
  discount_total >= 0 AND shipping_discount >= 0 AND shipping_discount <= shipping_cost
  AND total = subtotal - discount_total + shipping_cost - shipping_discount);  -- ⚠ cek data lama
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_note_len;
ALTER TABLE orders ADD CONSTRAINT orders_note_len CHECK (customer_note IS NULL OR char_length(customer_note) <= 500);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_created   ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at        ON orders(paid_at) WHERE paid_at IS NOT NULL;
UPDATE orders SET paid_at = updated_at WHERE paid_at IS NULL AND status IN ('paid','processing','shipped','completed');

-- (e) Item order v2
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS product_id      uuid REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sku             text,
  ADD COLUMN IF NOT EXISTS regular_price   integer,
  ADD COLUMN IF NOT EXISTS discount_amount integer NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  ADD COLUMN IF NOT EXISTS refunded_qty    integer NOT NULL DEFAULT 0 CHECK (refunded_qty >= 0);
UPDATE order_items oi SET product_id = pv.product_id, sku = pv.sku, regular_price = oi.price
  FROM product_variants pv WHERE pv.id = oi.variant_id AND oi.product_id IS NULL;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_refund_le_qty;
ALTER TABLE order_items ADD CONSTRAINT order_items_refund_le_qty CHECK (refunded_qty <= qty);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- (f) Pembayaran: agregat per order + percobaan per Snap token
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_type text,
  ADD COLUMN IF NOT EXISTS gross_amount integer,
  ADD COLUMN IF NOT EXISTS paid_at      timestamptz;
COMMENT ON COLUMN payments.midtrans_order_id IS 'DEPRECATED v2: id percobaan PERTAMA. Sumber kebenaran: payment_attempts.';

CREATE TABLE IF NOT EXISTS payment_attempts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  midtrans_order_id text NOT NULL UNIQUE,
  snap_token        text,
  expires_at        timestamptz,
  status            text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','superseded','settled','failed','expired')),
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_order ON payment_attempts(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_attempts_active ON payment_attempts(order_id) WHERE status = 'active';
INSERT INTO payment_attempts (order_id, midtrans_order_id, status, created_at)
SELECT order_id, midtrans_order_id,
       CASE WHEN transaction_status IN ('settlement','capture') THEN 'settled'
            WHEN transaction_status = 'pending' THEN 'active'
            WHEN transaction_status = 'expire'  THEN 'expired'
            ELSE 'failed' END,
       created_at
FROM payments ON CONFLICT (midtrans_order_id) DO NOTHING;
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;

-- (g) Pengaturan toko (satu baris, kolom bertipe; bukan key-value)
CREATE TABLE IF NOT EXISTS store_settings (
  id                          boolean PRIMARY KEY DEFAULT true CHECK (id),
  store_name                  text    NOT NULL DEFAULT 'KRIYA',
  support_email               text,
  support_phone               text,
  tax_rate_bp                 integer NOT NULL DEFAULT 1100 CHECK (tax_rate_bp BETWEEN 0 AND 5000),
  prices_include_tax          boolean NOT NULL DEFAULT true,
  pending_payment_ttl_minutes integer NOT NULL DEFAULT 1440 CHECK (pending_payment_ttl_minutes BETWEEN 15 AND 10080),
  return_window_days          integer NOT NULL DEFAULT 7 CHECK (return_window_days BETWEEN 0 AND 60),
  low_stock_threshold_default integer NOT NULL DEFAULT 3 CHECK (low_stock_threshold_default >= 0),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);
INSERT INTO store_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
