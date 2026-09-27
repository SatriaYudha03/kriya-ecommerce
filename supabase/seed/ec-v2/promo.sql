-- supabase/seed/ec-v2/promo.sql
-- Seed demo idempoten domain C (Promo & Laporan)
-- 3 kupon publik + 2 kupon privat dengan prefix ECC- sesuai §2.1

INSERT INTO coupons (
    code,
    description_i18n,
    discount_type,
    amount,
    max_discount,
    min_subtotal,
    starts_at,
    ends_at,
    usage_limit,
    usage_limit_per_user,
    applies_to,
    exclude_sale_items,
    is_public,
    is_active
) VALUES
-- 1. Kupon Publik 1: Diskon Persentase 10%
(
    'ECC-DISKON10',
    '{"id": "Diskon 10% potongan maksimal Rp100.000 dengan minimal belanja Rp500.000", "en": "10% off up to Rp100,000 with minimum purchase of Rp500,000"}'::jsonb,
    'percent',
    10,
    100000,
    500000,
    NULL,
    NULL,
    100,
    2,
    'all',
    false,
    true,
    true
),
-- 2. Kupon Publik 2: Potongan Tetap Rp50.000
(
    'ECC-HEMAT50K',
    '{"id": "Potongan langsung Rp50.000 untuk minimal belanja Rp300.000", "en": "Flat Rp50,000 discount for minimum purchase of Rp300,000"}'::jsonb,
    'fixed_cart',
    50000,
    NULL,
    300000,
    NULL,
    NULL,
    200,
    1,
    'all',
    false,
    true,
    true
),
-- 3. Kupon Publik 3: Gratis Ongkir
(
    'ECC-GRATISONGKIR',
    '{"id": "Gratis ongkos kirim seluruh Indonesia dengan minimal belanja Rp200.000", "en": "Free shipping across Indonesia with minimum purchase of Rp200,000"}'::jsonb,
    'free_shipping',
    0,
    NULL,
    200000,
    NULL,
    NULL,
    500,
    3,
    'all',
    false,
    true,
    true
),
-- 4. Kupon Privat 1: Member VIP Diskon 15% (exclude sale)
(
    'ECC-VIPMEMBER',
    '{"id": "Voucher eksklusif member VIP: diskon 15% hingga Rp250.000 (min. belanja Rp1.000.000)", "en": "Exclusive VIP member voucher: 15% off up to Rp250,000 (min. purchase Rp1,000,000)"}'::jsonb,
    'percent',
    15,
    250000,
    1000000,
    NULL,
    NULL,
    50,
    1,
    'all',
    true,
    false,
    true
),
-- 5. Kupon Privat 2: Potongan Rp100.000 Pelanggan Setia
(
    'ECC-PRIVAT100K',
    '{"id": "Kupon privat potongan Rp100.000 khusus apresiasi pelanggan setia", "en": "Private coupon Rp100,000 off for special customer appreciation"}'::jsonb,
    'fixed_cart',
    100000,
    NULL,
    750000,
    NULL,
    NULL,
    30,
    1,
    'all',
    false,
    false,
    true
)
ON CONFLICT (code) DO UPDATE SET
    description_i18n = EXCLUDED.description_i18n,
    discount_type = EXCLUDED.discount_type,
    amount = EXCLUDED.amount,
    max_discount = EXCLUDED.max_discount,
    min_subtotal = EXCLUDED.min_subtotal,
    starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    usage_limit = EXCLUDED.usage_limit,
    usage_limit_per_user = EXCLUDED.usage_limit_per_user,
    applies_to = EXCLUDED.applies_to,
    exclude_sale_items = EXCLUDED.exclude_sale_items,
    is_public = EXCLUDED.is_public,
    is_active = EXCLUDED.is_active,
    updated_at = now();
