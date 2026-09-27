-- supabase/seed/ec-v2/customer.sql
-- Seed demo data untuk Domain B: Alamat demo untuk akun customer yang ada di profiles
-- Idempoten: hanya menambahkan alamat bila user belum memiliki alamat dengan label tersebut

DO $$
DECLARE
  cust RECORD;
BEGIN
  -- Iterasi profile customer yang tersedia di DB
  FOR cust IN
    SELECT p.id, COALESCE(NULLIF(p.full_name, ''), 'Pelanggan KRIYA') AS name,
           COALESCE(NULLIF(p.phone, ''), '081234567890') AS phone
    FROM profiles p
    WHERE p.role = 'customer' OR p.role IS NULL
    LIMIT 10
  LOOP
    -- 1. Alamat Rumah Utama (Jakarta Selatan / DKI Jakarta)
    IF NOT EXISTS (SELECT 1 FROM addresses WHERE user_id = cust.id AND label = 'Rumah Utama') THEN
      INSERT INTO addresses (
        user_id, label, recipient, phone, address_line, district, city, province_code, postal_code, notes, is_default
      ) VALUES (
        cust.id,
        'Rumah Utama',
        cust.name,
        cust.phone,
        'Jl. Kemang Raya No. 45B',
        'Mampang Prapatan',
        'Jakarta Selatan',
        '31',
        '12730',
        'Pagar hitam, dekat pos satpam komplek',
        NOT EXISTS (SELECT 1 FROM addresses WHERE user_id = cust.id AND is_default = true)
      );
    END IF;

    -- 2. Alamat Kantor (Bandung / Jawa Barat)
    IF NOT EXISTS (SELECT 1 FROM addresses WHERE user_id = cust.id AND label = 'Kantor Studio') THEN
      INSERT INTO addresses (
        user_id, label, recipient, phone, address_line, district, city, province_code, postal_code, notes, is_default
      ) VALUES (
        cust.id,
        'Kantor Studio',
        cust.name,
        cust.phone,
        'Jl. Dago Asri No. 12, Lantai 3',
        'Coblong',
        'Bandung',
        '32',
        '40135',
        'Titipkan ke resepsionis lobi',
        false
      );
    END IF;

    -- 3. Alamat Villa/Weekend (Denpasar / Bali)
    IF NOT EXISTS (SELECT 1 FROM addresses WHERE user_id = cust.id AND label = 'Villa Sanur') THEN
      INSERT INTO addresses (
        user_id, label, recipient, phone, address_line, district, city, province_code, postal_code, notes, is_default
      ) VALUES (
        cust.id,
        'Villa Sanur',
        cust.name,
        cust.phone,
        'Jl. Danau Tamblingan No. 88',
        'Sanur',
        'Denpasar',
        '51',
        '80228',
        'Hubungi penjaga villa sebelum kirim',
        false
      );
    END IF;
  END LOOP;
END $$;
