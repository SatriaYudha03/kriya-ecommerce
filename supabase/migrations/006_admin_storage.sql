-- 006_admin_storage.sql

-- Panel admin M6: izinkan admin meng-upload/mengganti/menghapus gambar produk
-- langsung ke Supabase Storage bucket 'products' dari sisi FE (pengecualian
-- "FE boleh upload Storage di halaman admin", KRIYA-MASTER Bagian 5).
--
-- Bucket 'products' sudah public (baca jalan lewat URL publik). storage.objects
-- RLS aktif tanpa policy => tulis dari client terblokir. Karena tabel profiles
-- juga RLS-aktif tanpa policy select untuk 'authenticated', pengecekan role harus
-- lewat fungsi SECURITY DEFINER agar bisa membaca profiles.role.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- Policy tulis khusus admin di bucket 'products' (baca tetap publik).
DROP POLICY IF EXISTS "admin insert products" ON storage.objects;
CREATE POLICY "admin insert products" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'products' AND public.is_admin());

DROP POLICY IF EXISTS "admin update products" ON storage.objects;
CREATE POLICY "admin update products" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'products' AND public.is_admin());

DROP POLICY IF EXISTS "admin delete products" ON storage.objects;
CREATE POLICY "admin delete products" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'products' AND public.is_admin());
