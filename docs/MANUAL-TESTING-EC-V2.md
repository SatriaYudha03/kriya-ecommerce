# Panduan Pengujian Manual KRIYA E-Commerce v2

Dokumen ini adalah panduan langkah-demi-langkah bagi Satria untuk melakukan pengujian manual menyeluruh (functional & visual test) atas seluruh fitur E-Commerce v2 sebelum penetapan Gerbang G2 / G3.

---

## 1. Persiapan Lingkungan Pengujian

### 1.1 Pastikan Database Terkini
Terapkan migrasi skema dan seed data demo v2:
```bash
# 1. Pastikan migrasi 001 s.d. 013 terpasang
for file in supabase/migrations/*.sql; do
  psql "$SUPABASE_DB_URL" -f "$file"
done

# 2. Jalankan seed demo idempoten v2
psql "$SUPABASE_DB_URL" -f supabase/seed/ec-v2/catalog.sql
psql "$SUPABASE_DB_URL" -f supabase/seed/ec-v2/customer.sql
psql "$SUPABASE_DB_URL" -f supabase/seed/ec-v2/promo.sql
psql "$SUPABASE_DB_URL" -f supabase/seed/ec-v2/aftersales.sql
```

### 1.2 Menjalankan Layanan
Buka 2 terminal:
```bash
# Terminal 1: Backend Go API (:8080)
cd services/api
go run cmd/api/main.go

# Terminal 2: Frontend Next.js (:3000)
cd apps/web
pnpm dev
```
Buka browser di `http://localhost:3000`.

### 1.3 Akun Pengujian
1. **Akun Customer:** Daftar akun baru via `/register` (atau login via `/login`).
2. **Akun Admin:** Jadikan satu akun sebagai admin di database:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE id = '<USER_ID_ANDA>';
   ```

---

## 2. Pengujian Domain A: Katalog & Inventori

### 2.1 Filter Status & Visibilitas Produk
- **Langkah:**
  1. Masuk ke halaman admin produk: `http://localhost:3000/admin/products`.
  2. Buka salah satu produk atau buat produk baru, ubah status menjadi `draft` atau `archived`.
  3. Buka tab incognito / logout, kunjungi katalog publik: `http://localhost:3000/products`.
- **Ekspektasi:** Produk berstatus `draft` dan `archived` **tidak tampil** di katalog publik, namun tetap terlihat di tabel admin `/admin/products`.

### 2.2 Harga Sale Terjadwal & Badge SALE
- **Langkah:**
  1. Di `/admin/products/[id]`, pilih varian produk, set `sale_price` (lebih rendah dari harga normal), set `sale_starts_at` (kemarin) dan `sale_ends_at` (minggu depan).
  2. Kunjungi halaman produk di storefront.
- **Ekspektasi:** 
  - Kartu produk menampilkan badge `SALE`.
  - Harga normal dicoret (`line-through`) dan harga promo aktif yang dihitung server ditampilkan.
  - Varian yang sale-nya sudah lewat otomatis kembali ke harga normal tanpa mengubah data varian.

### 2.3 Kategori Bertingkat (Parent & Child Categories)
- **Langkah:**
  1. Buka `/admin/catalog/categories`.
  2. Periksa hierarki kategori (misal: Ruang Kerja -> Meja Kerja).
  3. Buka navigasi storefront `/categories/workspace`.
- **Ekspektasi:** 
  - Menampilkan chip / sub-kategori turunan.
  - Memilih kategori induk akan menampilkan seluruh produk dari kategori induk maupun sub-kategorinya via recursive CTE.

### 2.4 Atribut Facet & Tag Filter
- **Langkah:**
  1. Kunjungi `/products`.
  2. Di bilah filter samping (FilterBar), pilih filter atribut (misal: Style: Minimalis, Finish: Natural) dan filter Tag.
  3. Amati URL browser.
- **Ekspektasi:**
  - URL tersinkronisasi (contoh: `/products?attrs=...&tag=...`).
  - Jumlah produk yang tampil menyusut sesuai kecocokan filter.
  - Facet counter menampilkan jumlah varian yang relevan.

### 2.5 Admin Inventori & Ledger Mutasi Stok
- **Langkah:**
  1. Buka `/admin/inventory`.
  2. Periksa daftar stok per varian. Centang checkbox "Hanya Stok Rendah".
  3. Klik tombol "Sesuaikan Stok" / "Adjust Stock" pada salah satu varian.
  4. Pilih jenis mutasi: `restock` (+10) atau `damage` (-2), masukkan catatan, lalu simpan.
- **Ekspektasi:**
  - Stok varian langsung terbarui secara real-time.
  - Riwayat audit mutasi tercatat rapi di tab/halaman movement audit log dengan reason yang sesuai.

### 2.6 Rekomendasi Produk Terkait (Upsell & Cross-sell)
- **Langkah:**
  1. Buka halaman detail produk (PDP) salah satu produk demo F3-A (misal produk meja `ec-a-kursi-kerja-ergonomis`).
  2. Gulir ke bagian bawah PDP.
- **Ekspektasi:** 
  - Muncul blok "Produk Pelengkap" (Cross-sell) atau "Pilihan Serupa" (Upsell).

---

## 3. Pengujian Domain B: Customer & Pengaturan Toko

### 3.1 Buku Alamat Pelanggan
- **Langkah:**
  1. Login sebagai customer, buka menu akun: `http://localhost:3000/account/addresses`.
  2. Klik "Tambah Alamat Baru". Isi label, nama penerima, nomor HP, provinsi (dropdown terisi otomatis), kota, kecamatan, kode pos, dan alamat lengkap.
  3. Tambahkan alamat kedua, lalu klik "Jadikan Alamat Utama".
  4. Coba edit dan hapus salah satu alamat.
- **Ekspektasi:** 
  - CRUD berjalan lancar dengan modal formulir yang mudah diakses.
  - Badge "Utama / Default" berpindah secara akurat.

### 3.2 Keranjang Relasional & Merge saat Login
- **Langkah:**
  1. **Dalam kondisi logout (Guest):** Tambahkan 2 produk berbeda ke keranjang dari PDP.
  2. Buka `/cart`, ubah jumlah (quantity) produk, amati total belanja.
  3. Klik tombol Login / Register di navbar dan selesaikan autentikasi.
  4. Kembali ke `/cart`.
- **Ekspektasi:**
  - Item yang dimasukkan saat status guest otomatis digabung (`POST /cart/merge`) ke dalam keranjang akun database (`cart_items`).
  - Total belanja dihitung ulang oleh server secara deterministik.

### 3.3 Wishlist (Daftar Keinginan)
- **Langkah:**
  1. Buka PDP atau kartu produk di katalog, klik ikon hati (Wishlist).
  2. Kunjungi `http://localhost:3000/account/wishlist`.
- **Ekspektasi:** Produk tersimpan di daftar wishlist, bisa dipindahkan langsung ke keranjang belanja atau dihapus.

### 3.4 Admin Tarif Ongkir & Pengaturan Toko
- **Langkah:**
  1. Login sebagai admin, buka `http://localhost:3000/admin/shipping`.
  2. Edit tarif metode pengiriman aktif (misal: Reguler Zona 1 dari 150000 menjadi 120000).
  3. Buka `http://localhost:3000/admin/settings`.
  4. Ubah batas gratis ongkir (`free_shipping_threshold`) atau kontak toko.
- **Ekspektasi:** Perubahan tersimpan di database dan langsung berpengaruh pada estimasi ongkir di checkout.

---

## 4. Pengujian Domain C: Promosi, Kupon & Laporan

### 4.1 Banner Kupon Publik
- **Langkah:**
  1. Buka halaman utama atau checkout.
  2. Lihat banner promosi di bagian atas halaman.
- **Ekspektasi:**
  - Menampilkan kupon demo publik aktif (misal: `ECC-DISKON10`, `ECC-HEMAT50K`, `ECC-GRATISONGKIR`).
  - Terdapat tombol "Salin Kode" yang menyalin kode promo ke clipboard.

### 4.2 Validasi Kupon di Checkout
- **Langkah:**
  1. Masuk ke `/checkout`.
  2. Masukkan kode kupon yang tidak valid (misal: `SALAH123`), klik Terapkan.
  3. Masukkan kupon demo: `ECC-DISKON10`.
- **Ekspektasi:**
  - Kupon salah menampilkan pesan error yang ramah.
  - Kupon benar langsung memotong subtotal secara proporsional sesuai aturan diskon.

### 4.3 CRUD Kupon di Admin
- **Langkah:**
  1. Buka `http://localhost:3000/admin/coupons`.
  2. Klik "Buat Kupon Baru". Isi kode unik, tipe diskon (persen/nominal), batas kuota pemakaian per user, dan periode aktif.
  3. Buka detail kupon untuk melihat tab "Riwayat Pemakaian" (Redemptions).
- **Ekspektasi:** Kupon baru berhasil dibuat dan tercatat di daftar.

### 4.4 Laporan Penjualan & Dashboard Admin
- **Langkah:**
  1. Buka `http://localhost:3000/admin/reports`.
  2. Ganti filter rentang tanggal (7 hari terakhir, 30 hari terakhir).
  3. Klik tombol "Unduh CSV".
  4. Buka dashboard utama: `http://localhost:3000/admin`.
- **Ekspektasi:**
  - Kartu metrik pendapatan, pesanan, dan diskon terhitung akurat.
  - Grafik SVG penjualan harian merender data deret waktu.
  - File CSV berhasil diunduh dengan kolom yang rapi.

---

## 5. Pengujian Domain D: Purna Jual (After-Sales)

### 5.1 Riwayat & Detail Pesanan Customer
- **Langkah:**
  1. Buka `http://localhost:3000/orders`.
  2. Klik salah satu pesanan untuk membuka detailnya (`/orders/[id]`).
- **Ekspektasi:** Menampilkan ringkasan produk, alamat pengiriman, status badge berwarna, dan rincian pembayaran.

### 5.2 Pembatalan Mandiri oleh Customer
- **Langkah:**
  1. Buat pesanan baru hingga berstatus `pending_payment`.
  2. Di halaman `/orders/[id]`, klik tombol "Batalkan Pesanan".
  3. Pilih alasan pembatalan dan konfirmasi dialog.
- **Ekspektasi:**
  - Status pesanan berubah menjadi `cancelled`.
  - Stok produk otomatis dikembalikan (`Release`) via ledger inventori.

### 5.3 Event Timeline, Resi, & Catatan Admin
- **Langkah:**
  1. Login sebagai admin, buka `http://localhost:3000/admin/orders/[id]`.
  2. Tambahkan nomor resi pengiriman (tracking number).
  3. Tambahkan catatan admin internal.
  4. Ubah status pesanan menjadi `shipped` lalu `completed`.
- **Ekspektasi:**
  - Seluruh riwayat perubahan status tercatat di timeline pesanan (`order_events`).
  - Catatan tersimpan dan nomor resi tampil di sisi customer.

### 5.4 Ulasan Produk (Reviews)
- **Langkah:**
  1. Pada pesanan yang berstatus `completed`, buka `http://localhost:3000/account/reviews`.
  2. Berikan rating bintang (1–5) dan komentar ulasan produk.
  3. Login sebagai admin, buka `http://localhost:3000/admin/reviews`.
  4. Setujui (Approve) ulasan dan tulis balasan toko.
  5. Buka PDP produk terkait di storefront.
- **Ekspektasi:**
  - Ulasan yang di-approve tampil di tab Ulasan PDP.
  - Rating rata-rata produk terhitung ulang secara otomatis via trigger DB.

### 5.5 Retur Barang & Pengembalian Dana (Refunds)
- **Langkah:**
  1. Pada pesanan selesai, klik "Ajukan Retur" (`/orders/[id]`).
  2. Pilih item, kuantitas, alasan retur, dan rekening pengembalian dana.
  3. Buka `/admin/returns` sebagai admin, setujui permohonan retur.
  4. Klik "Proses Refund".
- **Ekspektasi:**
  - Status retur diperbarui.
  - Stok produk kembali bertambah (`Restock`) di inventori.

### 5.6 Notifikasi In-App & Cetak Invoice
- **Langkah:**
  1. Amati ikon lonceng notifikasi di header customer.
  2. Buka `http://localhost:3000/account/notifications`.
  3. Klik salah satu notifikasi untuk menandai telah dibaca.
  4. Buka `/orders/[id]/invoice` dan klik "Cetak Invoice".
- **Ekspektasi:**
  - Counter notifikasi belum dibaca berkurang.
  - Format invoice print-ready (tampilan cetak bersih, menyembunyikan navigasi).

---

## 6. Pengujian Jalur Checkout & Midtrans Sandbox (F2)

### 6.1 Alur Transaksi End-to-End
- **Langkah:**
  1. Masukkan produk ke keranjang, klik "Lanjut ke Pembayaran" (`/checkout`).
  2. Pilih Alamat Pengiriman dari buku alamat.
  3. Pilih Metode Pengiriman (Regular / Express).
  4. Masukkan kupon diskon (opsional).
  5. Periksa ringkasan kalkulasi harga:
     - Subtotal
     - Ongkos kirim berbobot
     - Diskon kupon (jika ada)
     - Total pembayaran
  6. Klik tombol "Bayar Sekarang".
- **Ekspektasi:**
  - Muncul pop-up Snap Midtrans.
  - Stok produk terkunci (`Reserve`) di database.

### 6.2 Simulasi Pembayaran Sandbox
- **Langkah:**
  1. Pada pop-up Snap Midtrans, pilih metode pembayaran (misal: Bank Transfer BCA Virtual Account / GoPay).
  2. Gunakan simulator pembayaran Midtrans Sandbox: [https://simulator.sandbox.midtrans.com/](https://simulator.sandbox.midtrans.com/).
  3. Masukkan nomor VA dan selesaikan pembayaran.
- **Ekspektasi:**
  - Webhook Midtrans menerima notifikasi dengan signature valid.
  - Status pesanan berpindah otomatis dari `pending_payment` menjadi `processing` atau `paid`.
  - Halaman diarahkan ke `/orders/[id]` dengan status sukses.

---

## 7. Pengujian Multi-Bahasa (i18n) & Aksesibilitas (a11y)

### 7.1 Multi-bahasa (ID / EN)
- **Langkah:**
  1. Klik tombol pemilih bahasa di header (ID ⇄ EN).
  2. Jelajahi halaman utama, katalog, detail produk, keranjang, checkout, dan riwayat pesanan.
- **Ekspektasi:** Seluruh label navigasi, tombol, pesan validasi, dan status berubah ke bahasa yang dipilih tanpa reload halaman penuh.

### 7.2 Aksesibilitas Keyboard & Screen Reader
- **Langkah:**
  1. Tekan tombol `Tab` pada keyboard untuk bernavigasi di halaman form alamat, form kupon, dan modal dialog.
  2. Buka dialog modal (misal: dialog batal pesanan atau formulir alamat) dan tekan tombol `Esc`.
- **Ekspektasi:**
  - Focus ring terlihat jelas.
  - Modal dapat ditutup menggunakan tombol `Esc`.
  - Seluruh tombol icon memiliki atribut `aria-label`.

---

## 8. Lembar Ceklist Demo Satria (Pass / Fail)

| No | Modul / Skenario | Status (✅ / ❌) | Catatan |
|---|---|---|---|
| 1 | Listing produk filter status (hanya published yang tampil) | | |
| 2 | Harga sale terjadwal & badge SALE aktif | | |
| 3 | Kategori pohon parent-child & recursive CTE | | |
| 4 | Facet atribut & filter tag di bilah samping | | |
| 5 | Ledger inventori & adjustment manual admin | | |
| 6 | Buku alamat customer (CRUD & set default) | | |
| 7 | Keranjang relasional & auto-merge saat login | | |
| 8 | Kupon promo publik & validasi kupon checkout | | |
| 9 | Laporan penjualan admin & download CSV | | |
| 10 | Dashboard admin live stats | | |
| 11 | Checkout v2: quote harga + ongkir + diskon | | |
| 12 | Popup Snap Midtrans Sandbox | | |
| 13 | Riwayat pesanan & pembatalan mandiri customer | | |
| 14 | Timeline status pesanan & catatan internal admin | | |
| 15 | Ulasan produk customer & moderasi admin | | |
| 16 | Alur retur barang customer & refund admin | | |
| 17 | Notifikasi in-app customer & invoice cetak | | |
| 18 | Penggantian bahasa dinamis (ID / EN) | | |
