-- 011_promotions.sql — domain C (docs/rencana/RENCANA-ECOMMERCE-V2.md §5.4)

CREATE TABLE IF NOT EXISTS coupons (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9-]{3,32}$'),
  description_i18n     jsonb NOT NULL DEFAULT '{}'::jsonb,
  discount_type        text NOT NULL CHECK (discount_type IN ('percent','fixed_cart','free_shipping')),
  amount               integer NOT NULL DEFAULT 0,
  max_discount         integer CHECK (max_discount IS NULL OR max_discount > 0),
  min_subtotal         integer NOT NULL DEFAULT 0 CHECK (min_subtotal >= 0),
  starts_at            timestamptz,
  ends_at              timestamptz,
  usage_limit          integer CHECK (usage_limit IS NULL OR usage_limit > 0),
  usage_limit_per_user integer CHECK (usage_limit_per_user IS NULL OR usage_limit_per_user > 0),
  applies_to           text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all','products','categories')),
  exclude_sale_items   boolean NOT NULL DEFAULT false,
  is_public            boolean NOT NULL DEFAULT false,
  is_active            boolean NOT NULL DEFAULT true,
  created_by           uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CHECK ((discount_type = 'percent'       AND amount BETWEEN 1 AND 100)
      OR (discount_type = 'fixed_cart'    AND amount > 0 AND max_discount IS NULL)
      OR (discount_type = 'free_shipping' AND amount = 0 AND max_discount IS NULL)),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at));
CREATE TABLE IF NOT EXISTS coupon_products (
  coupon_id  uuid NOT NULL REFERENCES coupons(id)  ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id, product_id));
CREATE TABLE IF NOT EXISTS coupon_categories (
  coupon_id   uuid NOT NULL REFERENCES coupons(id)    ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id, category_id));
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id         uuid NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,  -- kupon terpakai: nonaktifkan, jangan hapus
  order_id          uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,  -- D1: 1 kupon per order
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  items_discount    integer NOT NULL DEFAULT 0 CHECK (items_discount >= 0),
  shipping_discount integer NOT NULL DEFAULT 0 CHECK (shipping_discount >= 0),
  status            text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','applied','released')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON coupon_redemptions(coupon_id, status);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user   ON coupon_redemptions(user_id, coupon_id);

ALTER TABLE coupons            ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
