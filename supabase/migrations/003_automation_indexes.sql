-- 003_automation_indexes.sql
-- Create indexes for n8n-writable columns to optimize automation queries

CREATE INDEX IF NOT EXISTS idx_carts_followed_up_at ON carts(followed_up_at);
CREATE INDEX IF NOT EXISTS idx_orders_reminded_at ON orders(reminded_at);
