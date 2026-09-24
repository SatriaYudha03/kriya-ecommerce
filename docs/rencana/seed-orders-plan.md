# Rencana: Seed 100 order sintetis + data pendukung

> Status: **rencana, belum dieksekusi.** Disimpan untuk dikerjakan nanti.

## Context

Proyek KRIYA butuh data order yang lebih banyak dan bervariasi untuk keperluan testing/demo (mis. panel admin M6 "kelola pesanan"). Saat ini di Supabase live (`nmlhpeqpahihfwzbqmzp`) hanya ada **2 auth.users** (akun asli Satria + `admin@kriya.com`) dan **2 order** (keduanya oleh Satria, produk sama: UBIN shoe rack). 100 order baru tidak masuk akal kalau cuma dari 2 customer — jadi rencana ini juga menambah data relasional di tabel lain (`auth.users`, `profiles`) supaya order yang dihasilkan realistis: user bervariasi, tanggal tersebar dari 1 Jan 2026 s.d. hari ini (12 Jul 2026), produk/varian bervariasi lintas 6 kategori, dan status pembayaran bervariasi.

Keputusan yang sudah dikonfirmasi ke user:
- Boleh insert langsung ke `auth.users` (trigger `handle_new_user()` otomatis membuat `profiles`). Akun-akun ini **tidak bisa login sungguhan** (password dummy/acak) — murni untuk relasi data.
- 2 order lama **tidak diubah/dihapus**; 100 order baru ditambahkan di atasnya → total akhir **102 order**.
- Jumlah customer sintetis baru: **25** (total pool pemesan = 26: Satria + 25 baru; `admin@kriya.com` tidak dipakai sebagai pemesan).

## Skema yang relevan (sudah diverifikasi lewat MCP Supabase)

- `profiles.id` → FK `auth.users(id)` ON DELETE CASCADE. Tidak ada CHECK constraint di `orders.status` (kolom TEXT bebas) — status resmi tetap mengikuti kontrak master: `pending_payment, paid, processing, shipped, completed, cancelled, expired`.
- `orders.user_id` → FK `profiles(id)` RESTRICT. `order_items.variant_id` → FK `product_variants(id)` RESTRICT. `payments.order_id` → FK `orders(id)` UNIQUE.
- `auth.users`: hanya kolom `id` yang NOT NULL — cukup isi `id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at`. `confirmed_at` adalah **generated column** (`LEAST(email_confirmed_at, phone_confirmed_at)`) — jangan disertakan di INSERT. `instance_id` akun asli = `00000000-0000-0000-0000-000000000000`, dipakai juga untuk akun sintetis.
- `product_variants`: 170 varian, stok 5–30 (avg 17), harga bervariasi, tersebar merata di 6 kategori (25–33 varian/kategori).

## Pendekatan eksekusi

Satu script SQL (`DO $$ ... $$` blocks), dijalankan langsung lewat `mcp__supabase__execute_sql` terhadap project live. **Bukan** ditaruh di `supabase/migrations/` (folder itu untuk perubahan skema, bukan data seed satu-kali) — disimpan sebagai `data/scripts/seed_orders.sql` untuk jejak audit/reproducibility, konsisten dengan script lain di `data/scripts/` (`generate_products.py`, `fetch_images.py`).

### Bagian A — 25 customer sintetis
Untuk tiap customer: insert 1 baris `auth.users` (email pola `seed.customerNN@kriya-seed.test`, password acak via `crypt(gen_random_uuid()::text, gen_salt('bf'))`, `email_confirmed_at = now()`, `raw_app_meta_data = '{"provider":"email","providers":["email"]}'`) → trigger `on_auth_user_created` otomatis insert `profiles(id, role='customer')` → lanjut `UPDATE profiles SET full_name, phone, address_line, city, province, postal_code` dari daftar nama & kota Indonesia yang disiapkan di script (15 kota Jawa/Bali seperti Jakarta, Bandung, Surabaya, Yogyakarta, Denpasar, Semarang, Malang, Bogor, dst; 10 kota luar Jawa/Bali seperti Medan, Makassar, Balikpapan, Padang, Manado, dst — rasio ±60/40 mencerminkan `shipping_zone`). Zona tiap customer (`jawa_bali`/`luar`) disimpan di tabel sementara `seed_customer_zone(profile_id, zone)` dalam transaksi yang sama supaya konsisten dipakai ulang di Bagian B.

Pool pemesan akhir = 25 profile baru + 1 profile Satria (zona `jawa_bali`, sesuai alamat asli Denpasar).

### Bagian B — 100 order baru
Loop 100 iterasi, tiap iterasi:
1. **User**: pilih random dari pool 26 customer (uniform `ORDER BY random() LIMIT 1`) — variasi jumlah order/customer muncul alami dari distribusi acak (~4 rata-rata, ada yang 1, ada yang 8+).
2. **created_at**: random timestamp uniform antara `2026-01-01 00:00:00+00` dan `now()`.
3. **status**: weighted random — `pending_payment 12%, paid 8%, processing 10%, shipped 15%, completed 35%, cancelled 12%, expired 8%`. Koreksi realisme: jika `created_at` dalam 7 hari terakhir, status dipaksa ke salah satu dari `{pending_payment, paid, processing, shipped}` saja (order sebaru itu belum masuk akal sudah `completed`/`cancelled`/`expired`).
4. **updated_at**: `created_at` + offset acak sesuai status (pending_payment: menit-jam; paid/processing: 1–2 hari; shipped: 3–5 hari; completed: 5–10 hari; cancelled: 0–2 hari; expired: ~3 hari tetap), di-cap tidak melebihi `now()`.
5. **shipping_zone/cost/address**: diturunkan dari zona & alamat customer yang dipilih (`jawa_bali`→150000, `luar`→300000), `shipping_address` JSON dari `full_name/phone/address_line/city/province/postal_code` profil tsb.
6. **order_items**: pilih 1–4 `product_variants` acak dengan `stock > 0` (`ORDER BY random() LIMIT n`, lintas kategori berbeda-beda tiap order), qty random 1–3 dibatasi `LEAST(qty, stock)`. Snapshot `name/color/size/price` dari variant saat itu. Untuk status **bukan** `cancelled`/`expired`, `product_variants.stock` dikurangi qty secara nyata (mensimulasikan reservasi terjual); untuk `cancelled`/`expired`, stok tidak disentuh (mensimulasikan reservasi yang dilepas kembali).
7. `orders.subtotal` = jumlah subtotal item, `total` = subtotal + shipping_cost.
8. **payments**: 1 baris, `midtrans_order_id` unik pola `KRIYA-XXXXXXXX`, `transaction_status` mengikuti status order (`pending_payment→pending`, `paid/processing/shipped/completed→settlement`, `cancelled→cancel`, `expired→expire`), `raw = null`.

## File yang dibuat/diubah
- **Baru**: `data/scripts/seed_orders.sql` — script lengkap Bagian A + B di atas (disimpan sebagai arsip, meski eksekusi sesungguhnya lewat MCP `execute_sql`).
- **Tidak ada perubahan skema** — tidak ada file baru di `supabase/migrations/` karena ini murni data, bukan DDL (kecuali tabel sementara `seed_customer_zone` yang dibuat & di-drop dalam sesi yang sama).

## Verifikasi setelah eksekusi
1. `select count(*) from orders` → harus 102. `select count(*) from payments` → 102. `select count(*) from order_items` → >100 (karena 1–4 item/order).
2. `select status, count(*) from orders group by status order by count(*) desc` — cek distribusi masuk akal & totalnya 102.
3. `select count(distinct user_id) from orders` — harus mendekati 26 (kemungkinan tidak semua customer kebagian order, itu wajar).
4. `select min(created_at), max(created_at) from orders` — rentang harus dari sekitar awal Januari 2026 s.d. hari ini.
5. Cek konsistensi total: `select id from orders o where o.total <> o.subtotal + o.shipping_cost` → harus kosong.
6. Cek tidak ada stok negatif: `select id, stock from product_variants where stock < 0` → harus kosong.
7. Spot-check 5 order acak (join `orders + order_items + payments + profiles`) untuk memastikan data terlihat wajar (nama, kota, produk, harga).
