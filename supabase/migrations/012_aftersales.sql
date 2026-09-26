-- 012_aftersales.sql — domain D (docs/rencana/RENCANA-ECOMMERCE-V2.md §5.5)

CREATE TABLE IF NOT EXISTS order_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status text,
  to_status   text NOT NULL,
  actor_type  text NOT NULL CHECK (actor_type IN ('customer','admin','system','payment_gateway')),
  actor_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id, created_at);
INSERT INTO order_events (order_id, from_status, to_status, actor_type, note, created_at)
SELECT o.id, NULL, o.status, 'system', 'backfill v2', o.created_at FROM orders o
WHERE NOT EXISTS (SELECT 1 FROM order_events e WHERE e.order_id = o.id);

CREATE TABLE IF NOT EXISTS order_notes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  author_id           uuid REFERENCES profiles(id) ON DELETE SET NULL,
  body                text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  is_customer_visible boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_order_notes_order ON order_notes(order_id, created_at);

CREATE TABLE IF NOT EXISTS product_reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid NOT NULL REFERENCES products(id)    ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id)    ON DELETE CASCADE,
  order_item_id uuid NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE CASCADE,
  rating        smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title         text CHECK (title IS NULL OR char_length(title) <= 120),
  body          text CHECK (body  IS NULL OR char_length(body)  <= 2000),
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_reply   text CHECK (admin_reply IS NULL OR char_length(admin_reply) <= 2000),
  replied_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id));
CREATE INDEX IF NOT EXISTS idx_reviews_product ON product_reviews(product_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_status  ON product_reviews(status, created_at DESC);

CREATE OR REPLACE FUNCTION kriya_refresh_product_rating() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pid uuid;
BEGIN
  FOR pid IN SELECT DISTINCT x FROM unnest(ARRAY[
      CASE WHEN TG_OP <> 'INSERT' THEN OLD.product_id END,
      CASE WHEN TG_OP <> 'DELETE' THEN NEW.product_id END]) AS x WHERE x IS NOT NULL LOOP
    UPDATE products p SET
      rating_count = s.cnt,
      rating_avg   = COALESCE(s.avg, 0)
    FROM (SELECT COUNT(*)::int AS cnt, ROUND(AVG(rating)::numeric, 2) AS avg
          FROM product_reviews WHERE product_id = pid AND status = 'approved') s
    WHERE p.id = pid;
  END LOOP;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_reviews_rating ON product_reviews;
CREATE TRIGGER trg_reviews_rating AFTER INSERT OR UPDATE OR DELETE ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION kriya_refresh_product_rating();

CREATE TABLE IF NOT EXISTS return_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'requested'
              CHECK (status IN ('requested','approved','rejected','received','refunded','cancelled')),
  reason_code text NOT NULL CHECK (reason_code IN
              ('damaged','wrong_item','not_as_described','missing_parts','changed_mind')),
  description text CHECK (description IS NULL OR char_length(description) <= 2000),
  admin_note  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz);
CREATE UNIQUE INDEX IF NOT EXISTS uq_return_open_per_order ON return_requests(order_id)
  WHERE status IN ('requested','approved','received');
CREATE INDEX IF NOT EXISTS idx_returns_status ON return_requests(status, created_at DESC);
CREATE TABLE IF NOT EXISTS return_request_items (
  return_id     uuid NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES order_items(id)     ON DELETE CASCADE,
  qty           integer NOT NULL CHECK (qty > 0),
  PRIMARY KEY (return_id, order_item_id));

CREATE TABLE IF NOT EXISTS refunds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  return_id       uuid REFERENCES return_requests(id) ON DELETE SET NULL,
  amount          integer NOT NULL CHECK (amount > 0),
  shipping_amount integer NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  reason          text,
  restock         boolean NOT NULL DEFAULT false,
  method          text NOT NULL DEFAULT 'manual' CHECK (method IN ('manual')),  -- D3
  created_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id);
CREATE TABLE IF NOT EXISTS refund_items (
  refund_id     uuid NOT NULL REFERENCES refunds(id)     ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  qty           integer NOT NULL CHECK (qty > 0),
  amount        integer NOT NULL CHECK (amount >= 0),
  PRIMARY KEY (refund_id, order_item_id));

CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('order_status','order_note','return_update','review_reply','promo')),
  title_i18n jsonb NOT NULL,
  body_i18n  jsonb NOT NULL,
  link       text,                       -- path FE relatif, mis. "/orders/<uuid>"
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE order_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews      ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds              ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
