-- 002_orders.sql

-- KRIYA transaksi: carts, orders, order_items, payments (AGENT-BE territory)

-- 1. Carts
CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{"variant_id","qty"}]
    followed_up_at TIMESTAMPTZ, -- n8n-writable (abandoned cart follow-up, M5)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'pending_payment',
    subtotal INTEGER NOT NULL,
    shipping_zone TEXT NOT NULL,
    shipping_cost INTEGER NOT NULL,
    total INTEGER NOT NULL,
    shipping_address JSONB NOT NULL, -- {recipient, phone, address_line, city, province, postal_code}
    reminded_at TIMESTAMPTZ, -- n8n-writable (status change notification, M5)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Order Items (snapshot harga & atribut varian saat order dibuat)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    color TEXT,
    size TEXT,
    qty INTEGER NOT NULL,
    price INTEGER NOT NULL,
    subtotal INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    midtrans_order_id TEXT UNIQUE NOT NULL,
    transaction_status TEXT,
    raw JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant ON order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_midtrans_order_id ON payments(midtrans_order_id);
