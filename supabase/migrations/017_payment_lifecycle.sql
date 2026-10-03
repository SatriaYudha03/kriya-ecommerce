-- 017_payment_lifecycle.sql — docs/rencana/RENCANA-PAYMENT-LIFECYCLE.md Fase 1.
--
-- (a) Tenggat bayar per order. Ditetapkan sekali saat order dibuat (created_at + TTL toko)
--     dan TIDAK pernah diperpanjang; payment_attempts.expires_at + expiry Snap disamakan
--     dengan nilai ini. Sweeper API meng-expire order pending yang melewati tenggat.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_due_at timestamptz;

-- Backfill order yang masih menunggu pembayaran: pakai expires_at attempt TERAKHIR (paling
-- longgar, supaya VA yang masih hidup tidak terpotong), fallback created_at + TTL toko.
UPDATE orders o
SET payment_due_at = COALESCE(
  (SELECT MAX(pa.expires_at) FROM payment_attempts pa WHERE pa.order_id = o.id),
  o.created_at + make_interval(mins => COALESCE(
    (SELECT pending_payment_ttl_minutes FROM store_settings LIMIT 1), 1440)))
WHERE o.status = 'pending_payment' AND o.payment_due_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_pending_due
  ON orders(payment_due_at) WHERE status = 'pending_payment';

-- (b) Anomali pembayaran: uang masuk untuk order yang sudah tertutup (cancelled/expired)
--     atau pembayaran kedua untuk order yang sudah lunas. Dicatat oleh webhook/sync/sweeper,
--     ditindaklanjuti admin (refund manual / abaikan). Akses hanya lewat API (RLS deny-all).
CREATE TABLE IF NOT EXISTS payment_anomalies (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  midtrans_order_id  text NOT NULL,
  kind               text NOT NULL CHECK (kind IN ('paid_after_close','double_payment')),
  order_status       text NOT NULL,          -- status order saat anomali terdeteksi
  transaction_status text NOT NULL,
  gross_amount       text,                   -- string persis dari Midtrans, mis. "150000.00"
  raw                jsonb,
  resolution         text CHECK (resolution IN ('refunded','ignored')),
  resolution_note    text CHECK (resolution_note IS NULL OR char_length(resolution_note) <= 2000),
  resolved_by        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (midtrans_order_id, kind),
  CHECK ((resolution IS NULL) = (resolved_at IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_payment_anomalies_open
  ON payment_anomalies(created_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_anomalies_order ON payment_anomalies(order_id);
ALTER TABLE payment_anomalies ENABLE ROW LEVEL SECURITY;
