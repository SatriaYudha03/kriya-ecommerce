-- 005_profile_fields.sql

-- Data diri & alamat default pada profiles (AGENT-BE territory).
-- Tujuan: user menyimpan sekali data diri + alamat lengkap di halaman Profil,
-- sehingga tidak perlu mengetik ulang saat checkout (prefill shipping_address).
-- Semua kolom nullable — profil boleh diisi sebagian.

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS full_name    TEXT,
    ADD COLUMN IF NOT EXISTS phone        TEXT,
    ADD COLUMN IF NOT EXISTS address_line TEXT,
    ADD COLUMN IF NOT EXISTS city         TEXT,
    ADD COLUMN IF NOT EXISTS province     TEXT,
    ADD COLUMN IF NOT EXISTS postal_code  TEXT;
