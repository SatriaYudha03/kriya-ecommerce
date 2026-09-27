-- supabase/seed/ec-v2/aftersales.sql
-- Seed demo after-sales domain: ulasan approved untuk 10 produk
-- Idempoten: dapat dijalankan berulang tanpa duplikasi
-- Prefix: ec-d-* untuk customer/order seed minimal, [ec-d] untuk review content

-- Customer seed minimal (jika belum ada dari seed-orders-plan)
DO $$
DECLARE
  review_user_id uuid := 'd3e43dec-0ed9-413e-a87c-7013c66da2bc'; -- ec-d-reviewer
  admin_id uuid := 'dfdcd5c8-3403-41fc-920c-5377a32ca907';
  product_ids uuid[];
  variant_ids uuid[];
  order_id uuid;
  item_id uuid;
  i int;
BEGIN
  -- Ensure reviewer profile exists
  INSERT INTO profiles (id, role, full_name)
  VALUES (review_user_id, 'customer', 'Reviewer Seed')
  ON CONFLICT (id) DO NOTHING;

  -- Select 10 published products with variants
  SELECT array_agg(DISTINCT p.id) INTO product_ids
  FROM products p
  JOIN product_variants pv ON pv.product_id = p.id
  WHERE p.status = 'published' AND pv.is_active = true
  LIMIT 10;

  IF array_length(product_ids, 1) < 10 THEN
    RAISE NOTICE 'Only % published products found, expected 10', array_length(product_ids, 1);
  END IF;

  -- For each product, create completed order + review
  FOR i IN 1..LEAST(array_length(product_ids, 1), 10) LOOP
    order_id := gen_random_uuid();
    item_id := gen_random_uuid();

    -- Get first active variant for this product
    SELECT pv.id INTO variant_ids[1]
    FROM product_variants pv
    WHERE pv.product_id = product_ids[i] AND pv.is_active = true
    LIMIT 1;

    IF variant_ids[1] IS NULL THEN
      CONTINUE;
    END IF;

    -- Seed minimal completed order (idempoten via order_number)
    INSERT INTO orders (
      id, order_number, user_id, status,
      subtotal, shipping_cost, shipping_discount, discount_total, tax_amount, total,
      shipping_zone, shipping_address, completed_at, created_at, updated_at
    )
    VALUES (
      order_id,
      'ECD-SEED-' || lpad(i::text, 2, '0'),
      review_user_id,
      'completed',
      1000000, 150000, 0, 0, 0, 1150000,
      'jawa_bali',
      jsonb_build_object(
        'recipient', 'Reviewer Seed',
        'phone', '081234567890',
        'address_line', 'Jl. Seed No. ' || i,
        'city', 'Bandung',
        'province', 'Jawa Barat',
        'postal_code', '40115'
      ),
      now() - interval '30 days',
      now() - interval '35 days',
      now() - interval '30 days'
    )
    ON CONFLICT (order_number) DO NOTHING;

    -- Seed order item
    INSERT INTO order_items (
      id, order_id, variant_id, product_id,
      name, sku, color, size, qty, price, regular_price, subtotal, discount_amount, refunded_qty
    )
    SELECT
      item_id, order_id, pv.id, pv.product_id,
      p.name, pv.sku, pv.color, pv.size, 1, pv.price, pv.price, pv.price, 0, 0
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.id = variant_ids[1]
    ON CONFLICT (id) DO NOTHING;

    -- Seed approved review (idempoten via unique index user+product)
    INSERT INTO product_reviews (
      id, product_id, user_id, order_id, order_item_id,
      rating, title, content, status, admin_reply, replied_by, replied_at, created_at
    )
    VALUES (
      gen_random_uuid(),
      product_ids[i],
      review_user_id,
      order_id,
      item_id,
      (CASE i % 3 WHEN 0 THEN 5 WHEN 1 THEN 4 ELSE 5 END), -- mostly 4-5 stars
      CASE i % 3
        WHEN 0 THEN '[ec-d] Produk sangat berkualitas'
        WHEN 1 THEN '[ec-d] Sesuai ekspektasi'
        ELSE '[ec-d] Recommended!'
      END,
      CASE i % 3
        WHEN 0 THEN '[ec-d] Material solid, finishing rapi. Pengiriman cepat dan aman. Sangat puas dengan pembelian ini.'
        WHEN 1 THEN '[ec-d] Kualitas bagus sesuai harga. Proses perakitan mudah mengikuti panduan. Overall memuaskan.'
        ELSE '[ec-d] Desain minimalis dan fungsional. Cocok untuk ruang terbatas. Highly recommended untuk yang cari furniture berkualitas.'
      END,
      'approved',
      CASE WHEN i % 2 = 0 THEN '[ec-d] Terima kasih atas ulasannya! Kami senang produk kami memuaskan Anda.' ELSE NULL END,
      CASE WHEN i % 2 = 0 THEN admin_id ELSE NULL END,
      CASE WHEN i % 2 = 0 THEN now() - interval '25 days' ELSE NULL END,
      now() - interval '28 days'
    )
    ON CONFLICT (user_id, product_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Seeded % product reviews (idempoten)', LEAST(array_length(product_ids, 1), 10);
END $$;
