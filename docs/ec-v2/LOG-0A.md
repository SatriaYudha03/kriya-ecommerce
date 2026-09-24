# LOG-0A

**Status:** Selesai
**Tanggal:** 2026-09-24

- File migrasi `008_core_v2.sql` sampai `012_aftersales.sql` telah dibuat persis sesuai RENCANA §5.1–§5.5.
- Seed ongkir telah digabungkan ke `010_customer_checkout.sql`.
- Daftar 38 provinsi di `010_customer_checkout.sql` telah diverifikasi kode dan penamaannya sesuai referensi Kemendagri/BPS yang berlaku.

**Catatan Uji Lokal:**
Karena keterbatasan lingkungan lokal (Docker tidak aktif), uji coba menggunakan `npx supabase start` dilewati. Script ditulis berprinsip idempoten (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) sesuai kontrak dokumen.

**Daftar query verifikasi ⚠ (Wajib dijalankan Claude di DB dev sebelum apply):**

1. Cek status order lama:
   ```sql
   SELECT DISTINCT status FROM orders;
   ```
   *Pastikan hanya berisi: pending_payment, paid, processing, shipped, completed, cancelled, expired, refunded.*

2. Cek anomali harga pada order lama sebelum mengaktifkan constraint `orders_money_check`:
   ```sql
   SELECT id, subtotal, shipping_cost, total FROM orders WHERE total != (subtotal + shipping_cost);
   ```
   *Constraint baru mengasumsikan total = subtotal - discount_total + shipping_cost - shipping_discount. Karena diskon default 0, total harus pas sama dengan subtotal + ongkir. Perbaiki data jika ada anomali.*

3. Cek anomali stok dan harga di varian produk sebelum mengaktifkan `product_variants_money_check`:
   ```sql
   SELECT id, stock, price FROM product_variants WHERE stock < 0 OR price <= 0;
   ```

**Permintaan lintas-domain:**
- (Tidak ada)
