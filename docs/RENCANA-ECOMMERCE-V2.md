# Rencana: KRIYA E-commerce v2 — dari "demo checkout" ke toko sungguhan

**Status:** 🟡 **RENCANA — belum dieksekusi.**
**Tanggal:** 2026-09-24
**Pemilik keputusan:** Satria. **Eksekutor:** 4 agent opencode (A/B/C/D) + Claude sebagai reviewer/integrator.
**Pasangan dokumen:** `docs/EKSEKUSI-PARALEL-V2.md`: pembagian fase, kepemilikan file, kontrak antar-agent, dan prompt peluncuran. **Dokumen ini adalah sumber kebenaran untuk skema dan kontrak API. Dokumen pasangannya sumber kebenaran untuk siapa mengerjakan apa.**

Rencana ini **menyerap** `docs/RENCANA-RIWAYAT-PEMBELIAN.md` (gap G1–G10 ada di sini, di domain D dan B). Rencana ini **tidak menyentuh** `docs/RENCANA-CHATBOT-AI.md` maupun tabel/fungsi milik AGENT-AI (`documents`, `match_documents`).

---

## 0. Ringkasan

KRIYA saat ini sudah bisa menampilkan katalog, menyimpan keranjang, checkout dengan Midtrans, dan menjalankan admin CRUD. Tetapi skemanya baru mencakup sekitar **20% dari yang dimiliki toko online sungguhan**. Belum ada kupon, ulasan, buku alamat, wishlist, ongkir berbasis berat, riwayat stok, retur/refund, timeline pesanan, nomor pesanan yang manusiawi, jalur bayar ulang, atau status produk draft.

v2 menambah **4 domain** dengan **5 migrasi** (`008`–`012`, 24 tabel baru dan kolom tambahan) dan sekitar **75 endpoint** baru/diubah. Pengerjaannya **4 fase**: F0 fondasi (3–4 agent paralel, disusul gerbang), F1 domain (4 agent paralel penuh), F2 integrasi checkout (2 agent paralel lalu 1), dan F3 pengerasan (4 agent paralel).

| Domain | Agent | Isi |
|---|---|---|
| **A — Katalog & Inventori** | Agent A | status draft/publish/arsip, harga coret & sale terjadwal, kategori bertingkat, tag, atribut + filter facet, produk terkait (upsell/cross-sell), ledger stok, stok menipis |
| **B — Customer & Checkout** | Agent B | buku alamat, wishlist, keranjang relasional + merge guest, ongkir tabel (zona × berat), lanjut bayar, admin pelanggan, pengaturan toko |
| **C — Promo & Laporan** | Agent C | kupon (persen/nominal/gratis ongkir, kuota, masa berlaku, batas per user, cakupan produk/kategori), laporan penjualan, dashboard admin v2 |
| **D — After-sales** | Agent D | riwayat pesanan v2, timeline + catatan pesanan, resi, batal oleh customer, ulasan terverifikasi, retur & refund, notifikasi in-app, invoice cetak |

---

## 1. Kondisi sekarang (diverifikasi dari kode, 2026-09-24)

### 1.1 Inventaris skema (`supabase/migrations/001`–`007`)

| Tabel | Kolom penting | Catatan |
|---|---|---|
| `profiles` | id, role, full_name, phone, address_line, city, province, postal_code | satu alamat saja, `province` teks bebas |
| `categories` | slug, name, name_i18n | datar, tanpa hierarki/gambar/deskripsi |
| `products` | slug, name, category_slug, description, materials jsonb, dimensions jsonb, weight_kg, has_assembly_guide, *_i18n | tanpa status, tanpa SEO, tanpa rating, tanpa jumlah terjual |
| `product_variants` | sku, color, size, price, stock, *_i18n | tanpa harga coret/sale, tanpa berat per varian, **tanpa CHECK `stock >= 0`** |
| `product_images` | storage_path, alt, is_primary | – |
| `assembly_guides` | content_md | – |
| `carts` | user_id, **items jsonb**, followed_up_at | tanpa integritas referensial, jadi varian terhapus meninggalkan item yatim |
| `orders` | status **TEXT tanpa CHECK**, subtotal, shipping_zone, shipping_cost, total, shipping_address jsonb, reminded_at | tanpa nomor order, diskon, metode kirim, resi, atau stempel waktu per status |
| `order_items` | variant_id, name, color, size, qty, price, subtotal | tanpa sku, product_id, diskon per baris, qty refund |
| `payments` | order_id **UNIQUE**, midtrans_order_id, transaction_status, raw | satu percobaan bayar per order, jadi order tidak bisa dibayar ulang |

### 1.2 Gap yang terverifikasi

| # | Gap | Bukti | Dampak |
|---|---|---|---|
| S1 | Tidak ada status produk. Produk baru langsung tayang, produk lama tidak bisa diarsipkan | `001_commerce_core.sql` tabel `products` | 🔴 admin tidak bisa menyiapkan produk diam-diam |
| S2 | **Hapus produk yang pernah dipesan selalu gagal.** `order_items.variant_id` → `ON DELETE RESTRICT` | `002_orders.sql:37` | 🔴 admin melihat error 500 tanpa penjelasan |
| S3 | Stok berubah tanpa jejak (order, webhook, admin) | `repository/order.go` `Update("stock", ...)` | 🔴 selisih stok tidak bisa diaudit |
| S4 | Ongkir flat 2 zona, tidak peduli berat. Lemari 80 kg dan lampu 2 kg ongkirnya sama | `handler/order.go:14-17` | 🔴 tidak realistis untuk furniture |
| S5 | Order `pending_payment` tidak bisa dibayar ulang setelah popup Snap ditutup | `payments.order_id UNIQUE`, `snap_token` tidak disimpan | 🔴 order nyangkut (G7 dari rencana riwayat) |
| S6 | Status order tanpa CHECK & tanpa mesin status. Admin bisa set `completed → pending_payment` | `002_orders.sql`, `repository/admin.go:38` | 🔴 integritas data |
| S7 | Tidak ada kupon/promo/harga sale | – | 🟡 fitur dasar toko |
| S8 | Tidak ada ulasan/rating | – | 🟡 social proof |
| S9 | Satu alamat per user; `province` teks bebas | `005_profile_fields.sql` | 🟡 checkout ke alamat kedua harus ketik ulang |
| S10 | Keranjang jsonb | `carts.items` | 🟡 tidak bisa join/analitik; tidak ada FK |
| S11 | `GET /orders` N+1 & tanpa pagination; riwayat tanpa gambar/link/nomor order | `handler/order.go:122-132` | 🟡 (G4–G6, G9 dari rencana riwayat) |
| S12 | Tidak ada retur/refund/timeline/resi/notifikasi | – | 🟡 after-sales nol |
| S13 | Admin tidak punya CRUD kategori, daftar pelanggan, laporan | `cmd/api/main.go` | 🟡 |
| S14 | Status RLS tabel commerce **belum pasti**. Tidak ada `ENABLE ROW LEVEL SECURITY` di migrasi mana pun, padahal anon key publik di FE | grep `supabase/migrations` | 🔴 **perlu diverifikasi di F0.** Kalau RLS mati, tabel `orders`/`profiles` bisa dibaca via PostgREST dengan anon key |

---

## 2. Perbandingan dengan WooCommerce

WooCommerce dipakai sebagai acuan karena skemanya sudah teruji di jutaan toko. Yang diambil adalah **konsep domainnya**, bukan desain tabelnya (WooCommerce memakai model EAV `wp_posts` + `wp_postmeta` yang justru dihindari di Postgres; v2 memakai kolom bertipe eksplisit, sesuai larangan `any` di KRIYA-MASTER Bagian 5).

| Area | WooCommerce | KRIYA sekarang | KRIYA v2 | Keputusan |
|---|---|---|---|---|
| Status produk | `post_status`: draft, pending, private, publish | – | `products.status`: draft / published / archived | ✅ ambil (tanpa `pending`/`private`) |
| Harga | `_regular_price`, `_sale_price`, `_sale_price_dates_from/to` | `price` | `price` (normal) + `sale_price` + `sale_starts_at/ends_at`, fungsi SQL `kriya_effective_price()` | ✅ ambil |
| Kategori | taksonomi `product_cat` bertingkat, gambar, deskripsi | datar | `parent_id`, `description_i18n`, `image_path`, `position` | ✅ ambil (satu kategori utama per produk, dipertahankan) |
| Tag | `product_tag` | – | `tags` + `product_tags` | ✅ ambil |
| Atribut global | `woocommerce_attribute_taxonomies` + term `pa_*` + `wc_product_attributes_lookup` | `materials` jsonb | `attributes` + `attribute_terms` + `product_attribute_terms` (untuk filter) | ✅ ambil; `materials` tetap untuk tampilan |
| Varian | `product_variation` dengan atribut bebas | color + size | tetap color + size | ❌ tidak diubah. Dua dimensi cukup untuk furniture, dan mengubahnya merusak kontrak seed M1 |
| Upsell/cross-sell | `_upsell_ids`, `_crosssell_ids` | – (hanya "similar" via vektor yang akan dihapus) | `product_relations` | ✅ ambil, sekaligus pengganti "produk serupa" setelah pivot AI |
| Stok | `_stock`, `_manage_stock`, `_low_stock_amount`, `wc_reserved_stock` | `stock` | `stock` + `low_stock_threshold` + **ledger `stock_movements`** | ✅ ambil, dan lebih ketat dari Woo (Woo tidak punya ledger bawaan) |
| Rating | komentar tipe `review` + meta `rating`, `_wc_average_rating`, `_wc_review_count`, "verified owner" | – | `product_reviews` (wajib pembelian terverifikasi) + agregat di `products` via trigger | ✅ ambil |
| Pelanggan | `wc_customer_lookup` | `profiles` | `profiles` + view laporan pelanggan | ✅ via query, tanpa tabel lookup |
| Alamat | billing + shipping per user (1 masing-masing) | 1 | **buku alamat** (`addresses`, banyak per user) | ✅ lebih dari Woo (Woo butuh plugin) |
| Wishlist | plugin | – | `wishlist_items` | ✅ |
| Keranjang | `woocommerce_sessions` (serialized) | jsonb | `cart_items` relasional | ✅ |
| Ongkir | `shipping_zones` + `zone_locations` + `zone_methods` (flat rate, free shipping, table rate via plugin) | 2 konstanta | `provinces` + `shipping_zones` + `shipping_zone_provinces` + `shipping_methods` (flat / per kg, gratis ongkir di atas nominal) | ✅ ambil |
| Pajak | `woocommerce_tax_rates`, tax class | – | `store_settings.tax_rate_bp` (PPN, harga **sudah termasuk**) + `orders.tax_amount` informatif | ⚠️ versi sederhana: satu tarif PPN, bukan tabel tarif |
| Kupon | post `shop_coupon` + meta (discount_type, amount, usage_limit, usage_limit_per_user, minimum_amount, product_ids, product_categories, exclude_sale_items, free_shipping, individual_use, date_expires) | – | `coupons` + `coupon_products` + `coupon_categories` + `coupon_redemptions` | ✅ ambil hampir semua; **1 kupon per order** (setara `individual_use = true` selalu) |
| Order | `wc_orders` + `wc_order_addresses` + `wc_order_operational_data` | `orders` | `orders` + kolom v2 (order_number, diskon, metode kirim, resi, stempel waktu per status) | ✅ |
| Nomor order | ID post (angka) | UUID | `order_number` `KRY-YYMMDD-000123` | ✅ |
| Item order | `woocommerce_order_items` + `order_itemmeta` | snapshot sederhana | + sku, product_id, regular_price, discount_amount, refunded_qty | ✅ |
| Status order | pending, processing, on-hold, completed, cancelled, refunded, failed | 7 status tanpa CHECK | 8 status (+`refunded`) + CHECK + mesin status | ✅ (`on-hold`/`failed` tidak diperlukan untuk Midtrans) |
| Catatan order | komentar `order_note` (privat / ke customer) | – | `order_notes` (`is_customer_visible`) + `order_events` (audit perubahan status) | ✅ |
| Refund | post `shop_order_refund` + item refund | – | `refunds` + `refund_items` (**pencatatan manual**, tanpa panggil API refund Midtrans) | ⚠️ versi manual |
| Retur | plugin | – | `return_requests` + `return_request_items` | ✅ |
| Pembayaran | `woocommerce_payment_tokens`, meta transaksi | 1 baris `payments` | `payments` (agregat) + `payment_attempts` (tiap Snap token) | ✅ |
| Laporan | `wc_order_stats`, `wc_order_product_lookup` (Analytics) | 3 angka di `/admin/stats` | endpoint laporan dihitung langsung dari `orders`/`order_items` (tanpa tabel lookup) | ✅ tanpa tabel denormalisasi; volume data kecil |
| Notifikasi | email (WC_Emails) | n8n M5 (belum jalan) | `notifications` in-app; email tetap urusan n8n | ✅ |
| Guest checkout | ya | tidak | **tidak** | ❌ lihat §3.3 |
| Produk digital/download | `wc_download_log`, `downloadable_product_permissions` | – | – | ❌ tidak relevan |
| Multi-mata uang / multi-gudang | plugin | – | – | ❌ di luar cakupan |

---

## 3. Keputusan

### 3.1 Dikunci Satria (2026-09-24)
- **K1** Cakupan: **keempat domain** (katalog & inventori, customer & checkout, promo & kupon, review & after-sales).
- **K2** Pembagian agent: **vertikal per domain**. Satu agent memegang migrasi terkait, Go, dan FE domainnya.
- **K3** Ongkir: **tabel tarif internal** (zona per provinsi × berat), dikelola admin, tanpa API kurir pihak ketiga.
- **K4** Serap `RENCANA-RIWAYAT-PEMBELIAN.md`; biarkan `RENCANA-CHATBOT-AI.md` terpisah.

### 3.2 Keputusan desain turunan (disetujui Satria 2026-09-24, lihat §11 O1)

| Kode | Keputusan | Alasan |
|---|---|---|
| D1 | **1 kupon per order** | Menghindari aturan tumpuk kupon yang rumit; setara `individual_use` di Woo |
| D2 | Harga **sudah termasuk PPN** (default 11%, `tax_rate_bp = 1100`). `orders.tax_amount` hanya informasi di invoice | Standar B2C Indonesia; tidak mengubah angka yang sudah dibayar user |
| D3 | Refund **dicatat manual** oleh admin; uang dikembalikan di luar sistem (dashboard Midtrans / transfer) | API refund Midtrans hanya untuk sebagian metode bayar & sulit dites di sandbox |
| D4 | `variants[].price` di respons publik **berubah makna jadi harga efektif** (sudah memperhitungkan sale). Harga normal ada di field baru `regular_price` | Kompatibel mundur: FE lama tetap menampilkan "harga yang dibayar" |
| D5 | Produk yang pernah dipesan **tidak bisa dihapus permanen**. `DELETE` mengarsipkan (`status = archived`) | Riwayat pesanan dan ulasan tetap utuh |
| D6 | Ulasan: **hanya pembeli dengan order `completed`**, 1 ulasan per produk per user, **dimoderasi** (default `pending`) | Mencegah spam; label "pembelian terverifikasi" jadi bermakna |
| D7 | Retur: hanya order `completed`, dalam `return_window_days` (default 7) sejak `completed_at` | Standar marketplace Indonesia |
| D8 | Customer hanya bisa **membatalkan** order `pending_payment`. Setelah dibayar, jalurnya retur/refund lewat admin | Mencegah pembatalan setelah barang disiapkan |
| D9 | Nomor order `KRY-YYMMDD-NNNNNN` (tanggal WIB, sequence global) | Manusiawi, bisa diucapkan ke CS, tidak membocorkan volume harian |
| D10 | Kode kupon selalu HURUF BESAR, `^[A-Z0-9-]{3,32}$`. Input user dinormalisasi `upper(trim())` | Tanpa ekstensi `citext` |
| D11 | Keranjang guest tetap di Zustand (lokal). Saat login, `POST /cart/merge` menjumlahkan qty | Perilaku sekarang dipertahankan; hilangnya keranjang saat login diperbaiki |
| D12 | Kolom lama (`carts.items`, alamat di `profiles`, `orders.shipping_zone`) **tidak dihapus** di v2; ditandai DEPRECATED dan baru dihapus di migrasi pembersihan F3 **setelah Satria setuju** | n8n M5 (abandoned cart) mungkin membaca `carts.items`; butuh keputusan AGENT-AI |

### 3.3 Di luar cakupan v2 (sengaja)
Guest checkout (bisa belakangan via Supabase anonymous sign-in), API kurir/lacak resi otomatis, refund otomatis via Midtrans, multi-gudang, multi-mata uang, produk bundle, poin loyalitas, jasa perakitan berbayar sebagai add-on, upload foto ulasan oleh customer (butuh policy Storage baru untuk non-admin), email transaksional (tetap n8n M5), pencarian full-text (urusan pivot chatbot).

---

## 4. Fitur per domain

Label: 🛒 = storefront, 🛠 = admin, ⚙ = aturan/otomasi server.

### 4.1 Domain A — Katalog & Inventori
- 🛒 Kartu produk: **badge Sale** + harga coret, **rating bintang**, badge "Stok habis".
- 🛒 Listing: filter **tag**, **atribut** (material, gaya, ruangan…) dengan facet dari `GET /attributes`, filter `on_sale`, `in_stock`; sort `best_selling`, `rating`. Filter kategori induk ikut menyertakan subkategori.
- 🛒 PDP: harga coret + "Promo berakhir {tanggal}", ringkasan singkat, tag, atribut, blok **"Lengkapi ruanganmu"** (cross-sell) dan **"Pilihan lebih lengkap"** (upsell).
- 🛒 Kategori bertingkat di navigasi & breadcrumb, halaman kategori dengan deskripsi + gambar.
- 🛠 Form produk: status (draft/published/archived), featured, ringkasan, SEO title/description, tag, atribut, produk terkait. Varian: harga sale + jadwal, berat, ambang stok menipis, aktif/nonaktif.
- 🛠 Daftar produk admin sendiri (`GET /admin/products`) dengan filter status & stok menipis. Admin tidak lagi memakai endpoint publik, sehingga draft ikut terlihat.
- 🛠 CRUD kategori, tag, atribut + term.
- 🛠 **Inventori**: tabel stok per varian, filter menipis, **penyesuaian stok** (restock/koreksi + catatan), **riwayat pergerakan** per varian/order.
- ⚙ Endpoint publik hanya menampilkan `status = 'published'` dan varian `is_active`. Draft/arsip → 404.
- ⚙ Semua perubahan stok lewat ledger (`stock_movements`), termasuk edit stok di form varian, yang dikonversi jadi penyesuaian.
- ⚙ `DELETE /admin/products/:id` mengarsipkan bila pernah dipesan (D5).

### 4.2 Domain B — Customer & Checkout
- 🛒 **Buku alamat** `/account/addresses`: tambah/ubah/hapus, set default, provinsi dari daftar 38 provinsi (bukan teks bebas), maksimal 20 alamat.
- 🛒 **Wishlist**: ikon hati di kartu produk & PDP, halaman `/account/wishlist`, counter di header.
- 🛒 Keranjang: peringatan stok kurang / produk tidak tersedia per baris, harga coret. Saat login, keranjang guest **digabung** ke keranjang server.
- 🛒 Komponen checkout (dirakit di F2): **pemilih alamat**, **pemilih metode kirim** (Reguler / Kargo / Express + estimasi hari + biaya).
- 🛒 **Lanjutkan pembayaran** untuk order `pending_payment` (tombol di riwayat & detail order).
- 🛠 **Pelanggan**: daftar + cari (email/nama), jumlah order, total belanja, order terakhir, detail pelanggan.
- 🛠 **Pengiriman**: zona, provinsi per zona, metode per zona (flat / per kg, gratis ongkir di atas nominal, batas berat, estimasi).
- 🛠 **Pengaturan toko**: nama toko, kontak CS, tarif PPN, batas waktu bayar, jendela retur, ambang stok menipis default.
- ⚙ Ongkir = `base_cost + per_kg_cost × ceil(total_berat_kg)`; `total_berat = Σ (variant.weight_kg ?? product.weight_kg) × qty`. Metode dengan `max_weight_kg` < total berat tidak ditawarkan. `free_shipping_min_subtotal` terpenuhi → biaya 0.
- ⚙ Lanjut bayar: token aktif yang belum kedaluwarsa dipakai ulang. Kalau sudah kedaluwarsa, dibuat `payment_attempts` baru dengan `midtrans_order_id` baru (Midtrans menolak order_id berulang). Attempt lama ditandai `superseded`, tetapi **tetap dikenali webhook**.

### 4.3 Domain C — Promo & Laporan
- 🛒 **Input kupon** di keranjang/checkout: validasi langsung, pesan alasan penolakan yang jelas (kedaluwarsa, minimal belanja, kuota habis, …).
- 🛒 **Banner promo** menampilkan kupon publik aktif (`is_public`).
- 🛠 **Kupon**: CRUD, tipe `percent` (dengan `max_discount`), `fixed_cart`, `free_shipping`; min belanja; jadwal; kuota total & per user; cakupan semua / produk tertentu / kategori tertentu; kecualikan barang sale; publik/privat; aktif/nonaktif; daftar pemakaian.
- 🛠 **Laporan**: ringkasan periode, penjualan per hari/minggu/bulan (grafik batang SVG/CSS, **tanpa library chart baru**), produk terlaris, ekspor CSV.
- 🛠 **Dashboard v2**: omzet & order hari ini, menunggu bayar, perlu dikirim, stok menipis, ulasan menunggu moderasi, retur terbuka (masing-masing link ke halaman domain terkait).
- ⚙ Diskon dialokasikan **proporsional ke baris yang eligible**; sisa pembulatan ke baris eligible terakhir → `order_items.discount_amount`. Ini dibutuhkan agar refund per item akurat.
- ⚙ Siklus pemakaian: `reserved` saat order dibuat → `applied` saat `paid` → `released` saat `cancelled`/`expired`. Kuota menghitung `reserved + applied`. Baris kupon dikunci `FOR UPDATE` di transaksi order, jadi kuota tidak jebol saat checkout bersamaan.

### 4.4 Domain D — After-sales
- 🛒 **Riwayat pesanan v2** (menyerap rencana riwayat): auth guard, i18n penuh, pagination + filter status, nomor order, thumbnail + link produk, status badge tunggal, perbaikan N+1.
- 🛒 **Detail pesanan**: timeline status, catatan dari toko, kurir + resi (tombol salin), rincian diskon/ongkir/PPN, tombol **Batalkan** (hanya `pending_payment`), **Ajukan retur**, **Tulis ulasan** per item, **Cetak invoice** (`/orders/[id]/invoice`, CSS print, tanpa library PDF).
- 🛒 **Ulasan** di PDP: ringkasan bintang + distribusi 1–5, daftar ulasan (nama disamarkan "Satria Y.", label pembelian terverifikasi, balasan toko), sort & filter bintang. Halaman `/account/reviews` berisi item yang bisa diulas dan ulasan saya.
- 🛒 **Retur** `/account/returns`: ajukan per item + qty + alasan, lacak status.
- 🛒 **Notifikasi in-app**: lonceng di header dengan jumlah belum dibaca, halaman `/account/notifications`, tandai dibaca.
- 🛠 **Detail pesanan admin**: data pelanggan, timeline, catatan (privat/terlihat customer), input kurir + resi saat `shipped`, riwayat percobaan bayar, **buat refund** (per item, opsional kembalikan stok).
- 🛠 **Moderasi ulasan** (setujui/tolak/balas), **proses retur** (setujui → barang diterima → refund).
- ⚙ Semua perubahan status lewat **mesin status** (§6.1) + tercatat di `order_events` + memicu notifikasi untuk customer.

---

## 5. Skema database target

Konvensi untuk semua migrasi v2:
- Idempoten (`IF NOT EXISTS`, `DROP ... IF EXISTS` sebelum `ADD CONSTRAINT`, `ON CONFLICT DO NOTHING` untuk seed).
- PK `uuid DEFAULT gen_random_uuid()`, kecuali tabel penghubung (PK komposit) dan `provinces` (PK kode).
- Semua waktu `timestamptz`, semua uang `integer` rupiah, semua teks yang tampil ke user punya pasangan `*_i18n jsonb` `{"id": "...", "en": "..."}`.
- **Setiap tabel baru `ENABLE ROW LEVEL SECURITY` tanpa policy.** API Gin & n8n konek sebagai role pemilik tabel sehingga tidak terpengaruh, sedangkan akses PostgREST dengan anon key tertutup.
- **CHECK constraint yang bisa gagal pada data lama** (ditandai ⚠) wajib didahului query verifikasi. Kalau ada baris melanggar, **berhenti dan laporkan**; jangan "memperbaiki" data diam-diam.

### 5.1 `008_core_v2.sql` — order, pembayaran, pengaturan, keamanan

```sql
-- 008_core_v2.sql — Fondasi e-commerce v2 (docs/RENCANA-ECOMMERCE-V2.md §5.1)

-- (a) RLS untuk tabel commerce lama (S14). Verifikasi dulu status RLS via MCP/advisor.
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images    ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_guides   ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments          ENABLE ROW LEVEL SECURITY;

-- (b) Status order resmi + 'refunded'  ⚠ cek: SELECT DISTINCT status FROM orders;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN
  ('pending_payment','paid','processing','shipped','completed','cancelled','expired','refunded'));

-- (c) Nomor order manusiawi
CREATE SEQUENCE IF NOT EXISTS order_number_seq;
CREATE OR REPLACE FUNCTION kriya_next_order_number() RETURNS text
LANGUAGE sql VOLATILE AS $$
  SELECT 'KRY-' || to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYMMDD') || '-'
         || lpad(nextval('order_number_seq')::text, 6, '0')
$$;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number text;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT id, created_at FROM orders WHERE order_number IS NULL ORDER BY created_at LOOP
    UPDATE orders SET order_number = 'KRY-' || to_char(r.created_at AT TIME ZONE 'Asia/Jakarta','YYMMDD')
      || '-' || lpad(nextval('order_number_seq')::text, 6, '0') WHERE id = r.id;
  END LOOP;
END $$;
ALTER TABLE orders ALTER COLUMN order_number SET DEFAULT kriya_next_order_number();
ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_order_number ON orders(order_number);

-- (d) Kolom order v2
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS discount_total        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_discount     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount            integer NOT NULL DEFAULT 0,  -- PPN yang sudah TERMASUK di total
  ADD COLUMN IF NOT EXISTS shipping_method_id    uuid,                          -- FK ditambah di 010
  ADD COLUMN IF NOT EXISTS shipping_method_code  text,
  ADD COLUMN IF NOT EXISTS shipping_method_name  text,                          -- snapshot sesuai locale saat checkout
  ADD COLUMN IF NOT EXISTS shipping_eta_min_days smallint,
  ADD COLUMN IF NOT EXISTS shipping_eta_max_days smallint,
  ADD COLUMN IF NOT EXISTS total_weight_kg       numeric(10,2),
  ADD COLUMN IF NOT EXISTS customer_note         text,
  ADD COLUMN IF NOT EXISTS courier               text,
  ADD COLUMN IF NOT EXISTS tracking_number       text,
  ADD COLUMN IF NOT EXISTS paid_at               timestamptz,
  ADD COLUMN IF NOT EXISTS shipped_at            timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at          timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at          timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason         text;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_money_check;
ALTER TABLE orders ADD CONSTRAINT orders_money_check CHECK (
  discount_total >= 0 AND shipping_discount >= 0 AND shipping_discount <= shipping_cost
  AND total = subtotal - discount_total + shipping_cost - shipping_discount);  -- ⚠ cek data lama
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_note_len;
ALTER TABLE orders ADD CONSTRAINT orders_note_len CHECK (customer_note IS NULL OR char_length(customer_note) <= 500);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_created   ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at        ON orders(paid_at) WHERE paid_at IS NOT NULL;
UPDATE orders SET paid_at = updated_at WHERE paid_at IS NULL AND status IN ('paid','processing','shipped','completed');

-- (e) Item order v2
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS product_id      uuid REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sku             text,
  ADD COLUMN IF NOT EXISTS regular_price   integer,
  ADD COLUMN IF NOT EXISTS discount_amount integer NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  ADD COLUMN IF NOT EXISTS refunded_qty    integer NOT NULL DEFAULT 0 CHECK (refunded_qty >= 0);
UPDATE order_items oi SET product_id = pv.product_id, sku = pv.sku, regular_price = oi.price
  FROM product_variants pv WHERE pv.id = oi.variant_id AND oi.product_id IS NULL;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_refund_le_qty;
ALTER TABLE order_items ADD CONSTRAINT order_items_refund_le_qty CHECK (refunded_qty <= qty);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- (f) Pembayaran: agregat per order + percobaan per Snap token
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_type text,
  ADD COLUMN IF NOT EXISTS gross_amount integer,
  ADD COLUMN IF NOT EXISTS paid_at      timestamptz;
COMMENT ON COLUMN payments.midtrans_order_id IS 'DEPRECATED v2: id percobaan PERTAMA. Sumber kebenaran: payment_attempts.';

CREATE TABLE IF NOT EXISTS payment_attempts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  midtrans_order_id text NOT NULL UNIQUE,
  snap_token        text,
  expires_at        timestamptz,
  status            text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','superseded','settled','failed','expired')),
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_order ON payment_attempts(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_attempts_active ON payment_attempts(order_id) WHERE status = 'active';
INSERT INTO payment_attempts (order_id, midtrans_order_id, status, created_at)
SELECT order_id, midtrans_order_id,
       CASE WHEN transaction_status IN ('settlement','capture') THEN 'settled'
            WHEN transaction_status = 'pending' THEN 'active'
            WHEN transaction_status = 'expire'  THEN 'expired'
            ELSE 'failed' END,
       created_at
FROM payments ON CONFLICT (midtrans_order_id) DO NOTHING;
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;

-- (g) Pengaturan toko (satu baris, kolom bertipe; bukan key-value)
CREATE TABLE IF NOT EXISTS store_settings (
  id                          boolean PRIMARY KEY DEFAULT true CHECK (id),
  store_name                  text    NOT NULL DEFAULT 'KRIYA',
  support_email               text,
  support_phone               text,
  tax_rate_bp                 integer NOT NULL DEFAULT 1100 CHECK (tax_rate_bp BETWEEN 0 AND 5000),
  prices_include_tax          boolean NOT NULL DEFAULT true,
  pending_payment_ttl_minutes integer NOT NULL DEFAULT 1440 CHECK (pending_payment_ttl_minutes BETWEEN 15 AND 10080),
  return_window_days          integer NOT NULL DEFAULT 7 CHECK (return_window_days BETWEEN 0 AND 60),
  low_stock_threshold_default integer NOT NULL DEFAULT 3 CHECK (low_stock_threshold_default >= 0),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);
INSERT INTO store_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
```

### 5.2 `009_catalog_inventory.sql` — domain A

```sql
-- Kategori bertingkat
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS parent_id        uuid REFERENCES categories(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS description_i18n jsonb   NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS image_path       text,
  ADD COLUMN IF NOT EXISTS position         integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active        boolean NOT NULL DEFAULT true;
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_not_self_parent;
ALTER TABLE categories ADD CONSTRAINT categories_not_self_parent CHECK (parent_id IS NULL OR parent_id <> id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- Produk
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS status                 text    NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS short_description_i18n jsonb   NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_featured            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at           timestamptz,
  ADD COLUMN IF NOT EXISTS meta_title_i18n        jsonb   NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS meta_description_i18n  jsonb   NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rating_avg             numeric(3,2) NOT NULL DEFAULT 0,  -- ditulis trigger 012
  ADD COLUMN IF NOT EXISTS rating_count           integer NOT NULL DEFAULT 0,       -- ditulis trigger 012
  ADD COLUMN IF NOT EXISTS total_sales            integer NOT NULL DEFAULT 0;       -- ditulis trigger di bawah
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE products ADD CONSTRAINT products_status_check CHECK (status IN ('draft','published','archived'));
UPDATE products SET published_at = created_at WHERE published_at IS NULL AND status = 'published';
CREATE INDEX IF NOT EXISTS idx_products_status_created ON products(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured;

-- Varian: harga sale terjadwal, berat, ambang stok  ⚠ cek: stock < 0, price <= 0
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS sale_price          integer,
  ADD COLUMN IF NOT EXISTS sale_starts_at      timestamptz,
  ADD COLUMN IF NOT EXISTS sale_ends_at        timestamptz,
  ADD COLUMN IF NOT EXISTS weight_kg           numeric(8,2),   -- NULL = pakai products.weight_kg
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer,        -- NULL = pakai store_settings
  ADD COLUMN IF NOT EXISTS is_active           boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS position            integer NOT NULL DEFAULT 0;
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS product_variants_money_check;
ALTER TABLE product_variants ADD CONSTRAINT product_variants_money_check CHECK (
  price > 0 AND stock >= 0
  AND (sale_price IS NULL OR (sale_price > 0 AND sale_price < price))
  AND (sale_ends_at IS NULL OR sale_starts_at IS NULL OR sale_ends_at > sale_starts_at));

-- Harga efektif: SATU-SATUNYA definisi harga jual. Dipakai katalog, cart, quote, order.
CREATE OR REPLACE FUNCTION kriya_effective_price(p_price integer, p_sale integer,
                                                 p_start timestamptz, p_end timestamptz)
RETURNS integer LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN p_sale IS NOT NULL
               AND (p_start IS NULL OR p_start <= now())
               AND (p_end   IS NULL OR p_end   >  now())
         THEN p_sale ELSE p_price END
$$;

-- Tag
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE, name_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS product_tags (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id     uuid NOT NULL REFERENCES tags(id)     ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id));
CREATE INDEX IF NOT EXISTS idx_product_tags_tag ON product_tags(tag_id);

-- Atribut global (untuk filter)
CREATE TABLE IF NOT EXISTS attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE, name_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_filterable boolean NOT NULL DEFAULT true, position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS attribute_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id uuid NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  slug text NOT NULL, name_i18n jsonb NOT NULL DEFAULT '{}'::jsonb, position integer NOT NULL DEFAULT 0,
  UNIQUE (attribute_id, slug));
CREATE TABLE IF NOT EXISTS product_attribute_terms (
  product_id uuid NOT NULL REFERENCES products(id)        ON DELETE CASCADE,
  term_id    uuid NOT NULL REFERENCES attribute_terms(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, term_id));
CREATE INDEX IF NOT EXISTS idx_pat_term ON product_attribute_terms(term_id);

-- Produk terkait
CREATE TABLE IF NOT EXISTS product_relations (
  product_id         uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  related_product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  relation_type      text NOT NULL CHECK (relation_type IN ('upsell','cross_sell')),
  position           integer NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, related_product_id, relation_type),
  CHECK (product_id <> related_product_id));

-- Ledger stok
CREATE TABLE IF NOT EXISTS stock_movements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id  uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  delta       integer NOT NULL CHECK (delta <> 0),
  stock_after integer NOT NULL CHECK (stock_after >= 0),
  reason      text NOT NULL CHECK (reason IN
              ('initial','order_reserved','order_released','restock','adjustment','return_restock')),
  order_id    uuid REFERENCES orders(id)   ON DELETE SET NULL,
  actor_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON stock_movements(variant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_order   ON stock_movements(order_id) WHERE order_id IS NOT NULL;
INSERT INTO stock_movements (variant_id, delta, stock_after, reason, note)
SELECT pv.id, pv.stock, pv.stock, 'initial', 'backfill v2'
FROM product_variants pv
WHERE pv.stock > 0 AND NOT EXISTS (SELECT 1 FROM stock_movements sm WHERE sm.variant_id = pv.id);

-- total_sales dijaga DB, jadi tidak perlu kode di domain mana pun
CREATE OR REPLACE FUNCTION kriya_sync_total_sales() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'pending_payment' AND NEW.status = 'paid' THEN
    UPDATE products p SET total_sales = p.total_sales + s.qty
    FROM (SELECT product_id, SUM(qty) AS qty FROM order_items
          WHERE order_id = NEW.id AND product_id IS NOT NULL GROUP BY product_id) s
    WHERE p.id = s.product_id;
  ELSIF NEW.status = 'refunded' AND OLD.status IN ('paid','processing','shipped','completed') THEN
    UPDATE products p SET total_sales = GREATEST(p.total_sales - s.qty, 0)
    FROM (SELECT product_id, SUM(qty) AS qty FROM order_items
          WHERE order_id = NEW.id AND product_id IS NOT NULL GROUP BY product_id) s
    WHERE p.id = s.product_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_orders_total_sales ON orders;
CREATE TRIGGER trg_orders_total_sales AFTER UPDATE OF status ON orders
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION kriya_sync_total_sales();

ALTER TABLE tags                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tags            ENABLE ROW LEVEL SECURITY;
ALTER TABLE attributes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribute_terms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attribute_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_relations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements         ENABLE ROW LEVEL SECURITY;
```

### 5.3 `010_customer_checkout.sql` — domain B

```sql
-- Provinsi (38, kode 2 digit Kemendagri/BPS — agent 0A WAJIB memverifikasi daftar & kode)
CREATE TABLE IF NOT EXISTS provinces (
  code text PRIMARY KEY CHECK (code ~ '^[0-9]{2}$'),
  name text NOT NULL UNIQUE);
INSERT INTO provinces (code, name) VALUES
 ('11','Aceh'),('12','Sumatera Utara'),('13','Sumatera Barat'),('14','Riau'),('15','Jambi'),
 ('16','Sumatera Selatan'),('17','Bengkulu'),('18','Lampung'),('19','Kepulauan Bangka Belitung'),
 ('21','Kepulauan Riau'),('31','DKI Jakarta'),('32','Jawa Barat'),('33','Jawa Tengah'),
 ('34','DI Yogyakarta'),('35','Jawa Timur'),('36','Banten'),('51','Bali'),
 ('52','Nusa Tenggara Barat'),('53','Nusa Tenggara Timur'),('61','Kalimantan Barat'),
 ('62','Kalimantan Tengah'),('63','Kalimantan Selatan'),('64','Kalimantan Timur'),
 ('65','Kalimantan Utara'),('71','Sulawesi Utara'),('72','Sulawesi Tengah'),
 ('73','Sulawesi Selatan'),('74','Sulawesi Tenggara'),('75','Gorontalo'),('76','Sulawesi Barat'),
 ('81','Maluku'),('82','Maluku Utara'),('91','Papua'),('92','Papua Barat'),('93','Papua Selatan'),
 ('94','Papua Tengah'),('95','Papua Pegunungan'),('96','Papua Barat Daya')
ON CONFLICT (code) DO NOTHING;

-- Buku alamat
CREATE TABLE IF NOT EXISTS addresses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label         text NOT NULL DEFAULT 'Rumah' CHECK (char_length(label) BETWEEN 1 AND 40),
  recipient     text NOT NULL CHECK (char_length(recipient) BETWEEN 1 AND 100),
  phone         text NOT NULL CHECK (phone ~ '^(\+62|0)8[0-9]{7,12}$'),
  address_line  text NOT NULL CHECK (char_length(address_line) BETWEEN 5 AND 300),
  district      text,                                   -- kecamatan (opsional)
  city          text NOT NULL,
  province_code text NOT NULL REFERENCES provinces(code),
  postal_code   text NOT NULL CHECK (postal_code ~ '^[0-9]{5}$'),
  notes         text CHECK (notes IS NULL OR char_length(notes) <= 200),
  is_default    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_addresses_one_default ON addresses(user_id) WHERE is_default;
-- Backfill dari profiles (yang provinsinya bisa dicocokkan & format valid saja)
INSERT INTO addresses (user_id, label, recipient, phone, address_line, city, province_code, postal_code, is_default)
SELECT p.id, 'Utama', p.full_name, p.phone, p.address_line, p.city, pr.code, p.postal_code, true
FROM profiles p JOIN provinces pr ON lower(pr.name) = lower(trim(p.province))
WHERE p.address_line IS NOT NULL AND p.full_name IS NOT NULL AND p.city IS NOT NULL
  AND p.phone ~ '^(\+62|0)8[0-9]{7,12}$' AND p.postal_code ~ '^[0-9]{5}$'
  AND NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = p.id);
COMMENT ON COLUMN profiles.address_line IS 'DEPRECATED v2: pakai tabel addresses.';

-- Wishlist
CREATE TABLE IF NOT EXISTS wishlist_items (
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id));
CREATE INDEX IF NOT EXISTS idx_wishlist_product ON wishlist_items(product_id);

-- Keranjang relasional
CREATE TABLE IF NOT EXISTS cart_items (
  cart_id    uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  qty        integer NOT NULL CHECK (qty BETWEEN 1 AND 99),
  added_at   timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cart_id, variant_id));
-- Backfill (dijalankan ulang oleh task B2 saat cutover; idempoten, qty terbaru menang)
INSERT INTO cart_items (cart_id, variant_id, qty)
SELECT c.id, (e->>'variant_id')::uuid, LEAST(GREATEST((e->>'qty')::int, 1), 99)
FROM carts c CROSS JOIN LATERAL jsonb_array_elements(c.items) e
WHERE (e->>'variant_id') ~ '^[0-9a-f-]{36}$'
  AND EXISTS (SELECT 1 FROM product_variants pv WHERE pv.id = (e->>'variant_id')::uuid)
ON CONFLICT (cart_id, variant_id) DO UPDATE SET qty = EXCLUDED.qty, updated_at = now();
COMMENT ON COLUMN carts.items IS 'DEPRECATED v2: sumber kebenaran cart_items. Dihapus di migrasi pembersihan F3.';

-- Ongkir
CREATE TABLE IF NOT EXISTS shipping_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9_]{2,32}$'),
  name_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  position integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS shipping_zone_provinces (
  province_code text PRIMARY KEY REFERENCES provinces(code),   -- 1 provinsi = 1 zona
  zone_id       uuid NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS shipping_methods (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id                    uuid NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE,
  code                       text NOT NULL CHECK (code ~ '^[a-z0-9_]{2,32}$'),
  name_i18n                  jsonb NOT NULL DEFAULT '{}'::jsonb,
  rate_type                  text NOT NULL CHECK (rate_type IN ('flat','per_kg')),
  base_cost                  integer NOT NULL CHECK (base_cost >= 0),
  per_kg_cost                integer NOT NULL DEFAULT 0 CHECK (per_kg_cost >= 0),
  max_weight_kg              numeric(10,2),
  free_shipping_min_subtotal integer CHECK (free_shipping_min_subtotal IS NULL OR free_shipping_min_subtotal > 0),
  eta_min_days               smallint NOT NULL CHECK (eta_min_days >= 0),
  eta_max_days               smallint NOT NULL,
  is_active                  boolean NOT NULL DEFAULT true,
  position                   integer NOT NULL DEFAULT 0,
  UNIQUE (zone_id, code),
  CHECK (eta_max_days >= eta_min_days),
  CHECK (rate_type = 'per_kg' OR per_kg_cost = 0));
ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_shipping_method;
ALTER TABLE orders ADD CONSTRAINT fk_orders_shipping_method
  FOREIGN KEY (shipping_method_id) REFERENCES shipping_methods(id) ON DELETE SET NULL;
-- Seed zona & metode: lihat §5.3.1 (angka contoh; admin bisa ubah).

ALTER TABLE provinces               ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zone_provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_methods        ENABLE ROW LEVEL SECURITY;
```

#### 5.3.1 Seed ongkir (angka contoh)

| Zona `code` | Provinsi | Metode `code` | Tipe | Base | Per kg | Maks kg | Gratis ≥ | ETA |
|---|---|---|---|---|---|---|---|---|
| `jawa_bali` | 31,32,33,34,35,36,51 | `reguler` | per_kg | 40.000 | 3.000 | – | 5.000.000 | 3–5 |
| | | `kargo` | per_kg | 100.000 | 1.500 | – | – | 5–8 |
| | | `express` | per_kg | 90.000 | 6.000 | 30 | – | 1–2 |
| `sumatera` | 11–19, 21 | `reguler` | per_kg | 80.000 | 6.000 | – | – | 5–8 |
| | | `kargo` | per_kg | 180.000 | 3.000 | – | – | 7–12 |
| `kalimantan` | 61–65 | `reguler` / `kargo` | per_kg | 100.000 / 200.000 | 7.000 / 3.500 | – | – | 6–9 / 8–14 |
| `sulawesi` | 71–76 | `reguler` / `kargo` | per_kg | 110.000 / 220.000 | 8.000 / 4.000 | – | – | 6–10 / 9–15 |
| `timur` | 52,53,81,82,91–96 | `reguler` / `kargo` | per_kg | 160.000 / 300.000 | 12.000 / 6.000 | – | – | 8–14 / 12–21 |

Nama metode: `reguler` = {"id":"Reguler","en":"Regular"}, `kargo` = {"id":"Kargo","en":"Cargo"}, `express` = {"id":"Ekspres","en":"Express"}. Zona: {"id":"Jawa & Bali","en":"Java & Bali"}, dst.

### 5.4 `011_promotions.sql` — domain C

```sql
CREATE TABLE IF NOT EXISTS coupons (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9-]{3,32}$'),
  description_i18n     jsonb NOT NULL DEFAULT '{}'::jsonb,
  discount_type        text NOT NULL CHECK (discount_type IN ('percent','fixed_cart','free_shipping')),
  amount               integer NOT NULL DEFAULT 0,
  max_discount         integer CHECK (max_discount IS NULL OR max_discount > 0),
  min_subtotal         integer NOT NULL DEFAULT 0 CHECK (min_subtotal >= 0),
  starts_at            timestamptz,
  ends_at              timestamptz,
  usage_limit          integer CHECK (usage_limit IS NULL OR usage_limit > 0),
  usage_limit_per_user integer CHECK (usage_limit_per_user IS NULL OR usage_limit_per_user > 0),
  applies_to           text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all','products','categories')),
  exclude_sale_items   boolean NOT NULL DEFAULT false,
  is_public            boolean NOT NULL DEFAULT false,
  is_active            boolean NOT NULL DEFAULT true,
  created_by           uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CHECK ((discount_type = 'percent'       AND amount BETWEEN 1 AND 100)
      OR (discount_type = 'fixed_cart'    AND amount > 0 AND max_discount IS NULL)
      OR (discount_type = 'free_shipping' AND amount = 0 AND max_discount IS NULL)),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at));
CREATE TABLE IF NOT EXISTS coupon_products (
  coupon_id  uuid NOT NULL REFERENCES coupons(id)  ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id, product_id));
CREATE TABLE IF NOT EXISTS coupon_categories (
  coupon_id   uuid NOT NULL REFERENCES coupons(id)    ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id, category_id));
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id         uuid NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,  -- kupon terpakai: nonaktifkan, jangan hapus
  order_id          uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,  -- D1: 1 kupon per order
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  items_discount    integer NOT NULL DEFAULT 0 CHECK (items_discount >= 0),
  shipping_discount integer NOT NULL DEFAULT 0 CHECK (shipping_discount >= 0),
  status            text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','applied','released')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON coupon_redemptions(coupon_id, status);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user   ON coupon_redemptions(user_id, coupon_id);

ALTER TABLE coupons            ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
```

### 5.5 `012_aftersales.sql` — domain D

```sql
CREATE TABLE IF NOT EXISTS order_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status text,
  to_status   text NOT NULL,
  actor_type  text NOT NULL CHECK (actor_type IN ('customer','admin','system','payment_gateway')),
  actor_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id, created_at);
INSERT INTO order_events (order_id, from_status, to_status, actor_type, note, created_at)
SELECT o.id, NULL, o.status, 'system', 'backfill v2', o.created_at FROM orders o
WHERE NOT EXISTS (SELECT 1 FROM order_events e WHERE e.order_id = o.id);

CREATE TABLE IF NOT EXISTS order_notes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  author_id           uuid REFERENCES profiles(id) ON DELETE SET NULL,
  body                text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  is_customer_visible boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_order_notes_order ON order_notes(order_id, created_at);

CREATE TABLE IF NOT EXISTS product_reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid NOT NULL REFERENCES products(id)    ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id)    ON DELETE CASCADE,
  order_item_id uuid NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE CASCADE,
  rating        smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title         text CHECK (title IS NULL OR char_length(title) <= 120),
  body          text CHECK (body  IS NULL OR char_length(body)  <= 2000),
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_reply   text CHECK (admin_reply IS NULL OR char_length(admin_reply) <= 2000),
  replied_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id));
CREATE INDEX IF NOT EXISTS idx_reviews_product ON product_reviews(product_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_status  ON product_reviews(status, created_at DESC);

CREATE OR REPLACE FUNCTION kriya_refresh_product_rating() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pid uuid;
BEGIN
  FOR pid IN SELECT DISTINCT x FROM unnest(ARRAY[
      CASE WHEN TG_OP <> 'INSERT' THEN OLD.product_id END,
      CASE WHEN TG_OP <> 'DELETE' THEN NEW.product_id END]) AS x WHERE x IS NOT NULL LOOP
    UPDATE products p SET
      rating_count = s.cnt,
      rating_avg   = COALESCE(s.avg, 0)
    FROM (SELECT COUNT(*)::int AS cnt, ROUND(AVG(rating)::numeric, 2) AS avg
          FROM product_reviews WHERE product_id = pid AND status = 'approved') s
    WHERE p.id = pid;
  END LOOP;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_reviews_rating ON product_reviews;
CREATE TRIGGER trg_reviews_rating AFTER INSERT OR UPDATE OR DELETE ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION kriya_refresh_product_rating();

CREATE TABLE IF NOT EXISTS return_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'requested'
              CHECK (status IN ('requested','approved','rejected','received','refunded','cancelled')),
  reason_code text NOT NULL CHECK (reason_code IN
              ('damaged','wrong_item','not_as_described','missing_parts','changed_mind')),
  description text CHECK (description IS NULL OR char_length(description) <= 2000),
  admin_note  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz);
CREATE UNIQUE INDEX IF NOT EXISTS uq_return_open_per_order ON return_requests(order_id)
  WHERE status IN ('requested','approved','received');
CREATE INDEX IF NOT EXISTS idx_returns_status ON return_requests(status, created_at DESC);
CREATE TABLE IF NOT EXISTS return_request_items (
  return_id     uuid NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES order_items(id)     ON DELETE CASCADE,
  qty           integer NOT NULL CHECK (qty > 0),
  PRIMARY KEY (return_id, order_item_id));

CREATE TABLE IF NOT EXISTS refunds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  return_id       uuid REFERENCES return_requests(id) ON DELETE SET NULL,
  amount          integer NOT NULL CHECK (amount > 0),
  shipping_amount integer NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  reason          text,
  restock         boolean NOT NULL DEFAULT false,
  method          text NOT NULL DEFAULT 'manual' CHECK (method IN ('manual')),  -- D3
  created_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id);
CREATE TABLE IF NOT EXISTS refund_items (
  refund_id     uuid NOT NULL REFERENCES refunds(id)     ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  qty           integer NOT NULL CHECK (qty > 0),
  amount        integer NOT NULL CHECK (amount >= 0),
  PRIMARY KEY (refund_id, order_item_id));

CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('order_status','order_note','return_update','review_reply','promo')),
  title_i18n jsonb NOT NULL,
  body_i18n  jsonb NOT NULL,
  link       text,                       -- path FE relatif, mis. "/orders/<uuid>"
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE order_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews      ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds              ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
```

### 5.6 Kepemilikan tabel v2 (menggantikan KRIYA-MASTER Bagian 7 untuk tabel commerce)

**Tulis** = boleh INSERT/UPDATE/DELETE dari kode domain itu. **Baca** lintas domain selalu boleh (read-only SQL).

| Tabel / kolom | Penulis | Catatan |
|---|---|---|
| `products`, `product_variants`, `product_images`, `categories`, `tags`, `product_tags`, `attributes`, `attribute_terms`, `product_attribute_terms`, `product_relations`, `assembly_guides` | A | `products.rating_*` hanya trigger 012; `products.total_sales` hanya trigger 009 |
| `product_variants.stock`, `stock_movements` | A, **hanya lewat port `InventoryLedger`** | Core (checkout) & D memanggil port, tidak menulis langsung |
| `profiles` (data diri), `addresses`, `wishlist_items`, `carts`, `cart_items`, `provinces`, `shipping_*`, `store_settings` | B | `carts.followed_up_at` tetap n8n-writable |
| `payment_attempts` | B (lanjut bayar) + core (checkout/webhook) | |
| `coupons`, `coupon_*`, `coupon_redemptions` | C, redemption **hanya lewat port `DiscountApplier`** | |
| `order_events`, `order_notes`, `product_reviews`, `return_*`, `refunds`, `refund_items`, `notifications` | D, event **hanya lewat port `OrderEventRecorder`** | |
| `orders`, `order_items`, `payments` | **core** (buat order, webhook) + D (status pasca-bayar, resi, `refunded_qty`, pembatalan) | `orders.reminded_at` tetap n8n-writable |

---

## 6. Aturan bisnis lintas domain

### 6.1 Mesin status order (paket core `orderflow`, beku setelah F0)

| Dari \ Ke | paid | processing | shipped | completed | cancelled | expired | refunded |
|---|---|---|---|---|---|---|---|
| `pending_payment` | gateway | – | – | – | customer, admin, gateway | gateway | – |
| `paid` | – | admin | admin¹ | – | – | – | admin² |
| `processing` | – | – | admin¹ | – | – | – | admin² |
| `shipped` | – | – | – | admin, system | – | – | admin² |
| `completed` | – | – | – | – | – | – | admin² |

¹ wajib `courier` + `tracking_number`. ² hanya otomatis ketika total refund = `orders.total` (lewat endpoint refund, bukan set status manual). Transisi lain → `409 conflict`. Setiap transisi: set stempel waktu (`paid_at`, `shipped_at`, `completed_at`, `cancelled_at`), rekam `order_events`, buat `notifications` untuk customer.

**Efek samping per transisi** (dijalankan dalam transaksi yang sama):

| Transisi | Stok (`InventoryLedger`) | Kupon (`DiscountApplier`) | Pembayaran |
|---|---|---|---|
| (buat order) | `Reserve` | `Reserve` | attempt `active` |
| → `paid` | – | `Confirm` | attempt `settled`, `payments.paid_at` |
| → `cancelled` / `expired` | `Release` (idempoten) | `Release` | attempt `failed`/`expired`; customer cancel memanggil Midtrans cancel (best-effort) |
| refund `restock=true` | `Restock` per item | – | – |

### 6.2 Harga, diskon, pajak, total
1. `unit_price = kriya_effective_price(price, sale_price, sale_starts_at, sale_ends_at)` dievaluasi **saat transaksi order** (bukan dari quote).
2. `subtotal = Σ unit_price × qty`.
3. Kupon dievaluasi terhadap baris eligible (lihat §6.3) → `discount_total` + alokasi per baris.
4. `shipping_cost` dari metode terpilih; `shipping_discount` = `shipping_cost` jika kupon `free_shipping` atau `free_shipping_min_subtotal` metode terpenuhi (yang terakhir langsung membuat `shipping_cost = 0`, tanpa diskon).
5. `total = subtotal − discount_total + shipping_cost − shipping_discount` (dijaga CHECK DB).
6. `tax_amount = round(total × tax_rate_bp / (10000 + tax_rate_bp))` bila `prices_include_tax`.

### 6.3 Evaluasi kupon (urutan cek = urutan `reason`)
`not_found` → `inactive` → `not_started` → `expired` → `usage_limit_reached` (reserved+applied ≥ limit) → `user_limit_reached` → `not_applicable` (tidak ada baris eligible: cakupan produk/kategori, `exclude_sale_items`) → `min_subtotal_not_met` (dibandingkan dengan subtotal **baris eligible**).
Nilai: `percent` → `floor(eligible_subtotal × amount / 100)`, dibatasi `max_discount`; `fixed_cart` → `min(amount, eligible_subtotal)`; `free_shipping` → diskon ongkir penuh.

### 6.4 Stok
Reservasi saat order dibuat (perilaku M2 dipertahankan), dengan baris varian dikunci `FOR UPDATE` **dalam urutan `variant_id` menaik** supaya tidak deadlock. Setiap perubahan menulis `stock_movements` dengan `stock_after`. `Release` idempoten: kalau sudah ada movement `order_released` untuk order itu, jangan lakukan apa pun.

### 6.5 Lokalisasi snapshot
`order_items.name/color/size` dan `orders.shipping_method_name` di-snapshot sesuai locale saat checkout (keputusan K4 rencana riwayat: **tetap snapshot**). Notifikasi disimpan dwibahasa (`*_i18n`) dan server memilih locale saat dibaca.

---

## 7. Kontrak API v2

Konvensi KRIYA-MASTER Bagian 5 tetap berlaku (snake_case, envelope, kode error, `?lang=`/`Accept-Language`, pagination `page`/`limit` maks 60 → `meta`).

Tambahan:
- `DELETE` sukses → `200 {"data": {"id": "<uuid>"}}` (mengikuti pola admin M6).
- **Dilarang `gin.H` / `map[string]interface{}` untuk respons baru.** Setiap respons punya struct.
- Label 🔒 = **kontrak lintas agent** (dikonsumsi domain lain atau integrator). Bentuknya **beku sejak gerbang G0**; perubahan hanya lewat permintaan lintas-domain. Tanpa 🔒 = kontrak internal domain: pemilik domain boleh memperhalus asal tetap aditif, lalu mencatatnya di log.
- Aturan router Gin: **dalam satu metode HTTP, jangan campur segmen statis dan `:param` pada posisi yang sama** (mis. `POST /notifications/:id/read` bersama `POST /notifications/read-all` dilarang). Nama param: produk publik `:slug`, semua yang lain `:id`.

### 7.1 Registry rute (semua rute baru/diubah)

| Metode & path | Auth | Pemilik | Status |
|---|---|---|---|
| `GET /categories` | – | A | diubah (aditif) 🔒 |
| `GET /products` | – | A | diubah (aditif) 🔒 |
| `GET /products/:slug` | – | A | diubah (aditif) 🔒 |
| `GET /products/:slug/related` | – | A | baru |
| `GET /tags` · `GET /attributes` | – | A | baru |
| `GET /admin/products` | admin | A | baru |
| `POST /admin/products` · `PUT/DELETE /admin/products/:id` · varian · gambar | admin | A | diubah (aditif; DELETE → arsip) |
| `GET/POST /admin/categories` · `PUT/DELETE /admin/categories/:id` | admin | A | baru |
| `GET/POST /admin/tags` · `PUT/DELETE /admin/tags/:id` | admin | A | baru |
| `GET/POST /admin/attributes` · `PUT/DELETE /admin/attributes/:id` · `POST /admin/attributes/:id/terms` · `PUT/DELETE /admin/attributes/:id/terms/:term_id` | admin | A | baru |
| `GET /admin/inventory` · `GET /admin/inventory/movements` · `POST /admin/inventory/adjustments` | admin | A | baru |
| `GET/PUT /cart` | user | B | diubah (aditif) 🔒 |
| `POST /cart/merge` | user | B | baru 🔒 |
| `GET/POST /addresses` · `PUT/DELETE /addresses/:id` · `POST /addresses/:id/default` | user | B | baru 🔒 |
| `GET /wishlist` · `PUT/DELETE /wishlist/:id` (`:id` = product_id) | user | B | baru |
| `GET /shipping/provinces` | – | B | baru 🔒 |
| `GET /store` | – | B | baru 🔒 |
| `POST /orders/:id/pay` | user | B | baru 🔒 |
| `GET /admin/customers` · `GET /admin/customers/:id` | admin | B | baru |
| `GET/PUT /admin/settings` | admin | B | baru |
| `GET/POST /admin/shipping/zones` · `PUT/DELETE /admin/shipping/zones/:id` · `PUT /admin/shipping/zones/:id/provinces` · `POST /admin/shipping/zones/:id/methods` · `PUT/DELETE /admin/shipping/methods/:id` | admin | B | baru |
| `POST /coupons/validate` | user | C | baru 🔒 |
| `GET /coupons/public` | – | C | baru |
| `GET/POST /admin/coupons` · `GET/PUT/DELETE /admin/coupons/:id` · `GET /admin/coupons/:id/redemptions` | admin | C | baru |
| `GET /admin/stats` | admin | C | diubah (aditif) |
| `GET /admin/reports/summary` · `/sales` · `/top-products` | admin | C | baru |
| `GET /orders` | user | D | **diubah (breaking: pagination)** 🔒 |
| `GET /orders/:id` | user | D | diubah (aditif) 🔒 |
| `POST /orders/:id/cancel` | user | D | baru |
| `POST /orders/:id/returns` · `GET /returns` · `GET /returns/:id` | user | D | baru |
| `GET /products/:slug/reviews` · `GET /products/:slug/reviews/summary` | – | D | baru |
| `GET /me/reviewables` · `GET /me/reviews` · `POST /reviews` · `PUT/DELETE /reviews/:id` | user | D | baru |
| `GET /notifications` · `GET /notifications/unread-count` · `POST /notifications/read` | user | D | baru |
| `GET /admin/orders` · `GET /admin/orders/:id` | admin | D | diubah (aditif) / baru |
| `PUT /admin/orders/:id/status` | admin | D | diubah (aditif + mesin status) |
| `POST /admin/orders/:id/notes` · `POST /admin/orders/:id/refunds` | admin | D | baru |
| `GET /admin/reviews` · `PUT /admin/reviews/:id` | admin | D | baru |
| `GET /admin/returns` · `PUT /admin/returns/:id` | admin | D | baru |
| `POST /checkout/quote` | user | **core/integrator** | baru 🔒 |
| `POST /orders` | user | **core/integrator** | **diubah (breaking body di F2)** 🔒 |
| `POST /payments/midtrans/notification` | – | **core/integrator** | diubah (internal) |
| `GET /internal/orders/status` | internal | D | tidak berubah |

### 7.2 Domain A

**`GET /categories`** 🔒 item: `{"id","slug","name","parent_slug": null,"description": "","image_url": null,"product_count": 12}`. Hanya `is_active`. `product_count` hanya menghitung produk published (termasuk subkategori).

**`GET /products`** 🔒, parameter tambahan:
`tags=meja,jati` (OR) · `attrs=material.jati,material.mahoni,style.minimalis` (dalam atribut yang sama OR, antar atribut AND) · `on_sale=true` · `in_stock=true` · `featured=true` · `sort=newest|price_asc|price_desc|best_selling|rating`. `category=<slug>` mencakup subkategori. Harga filter/sort memakai harga efektif.
Item: `{"id","slug","name","category_slug","price_min","thumbnail_url","regular_price_min","on_sale","in_stock","is_featured","rating_avg","rating_count"}`
(`price_min` = harga efektif termurah dari varian aktif; `regular_price_min` = harga normal termurah.)

**`GET /products/:slug`** 🔒, tambahan: `"short_description"`, `"tags": [{"slug","name"}]`, `"attributes": [{"slug","name","terms": [{"slug","name"}]}]`, `"rating_avg"`, `"rating_count"`, `"category": {"slug","name","parent": {"slug","name"} | null}`, dan per varian: `"regular_price"`, `"on_sale"`, `"sale_ends_at"` (null bila tak ada), `"weight_kg"`. Varian nonaktif tidak dikirim. Draft/arsip → 404.

**`GET /products/:slug/related?type=upsell|cross_sell&limit=8`** → list item produk (bentuk sama dengan listing), published saja, urut `position`.

**`GET /tags`** → `[{"slug","name"}]`. **`GET /attributes?category=`** → `[{"slug","name","terms": [{"slug","name","product_count"}]}]`: atribut `is_filterable` saja, term dengan `product_count > 0` di kategori itu.

**Admin**
- `GET /admin/products?q=&status=&category=&low_stock=true&page=&limit=` → `[{"id","slug","name","status","category_slug","thumbnail_url","price_min","stock_total","variants_count","is_featured","updated_at"}]` + meta.
- Payload create/update produk (aditif terhadap M6): `"status"`, `"short_description"`, `"is_featured"`, `"meta_title"`, `"meta_description"`, `"tag_slugs": []`, `"attribute_term_ids": []`, `"upsell_ids": []`, `"cross_sell_ids": []`. Field teks tunggal (`short_description`, `meta_*`) disimpan ke kolom `*_i18n` dengan pola yang sama seperti field teks M6 yang sudah ada (cek `internal/catalog` hasil F0 sebelum menulis).
- Payload varian (aditif): `"sale_price"`, `"sale_starts_at"`, `"sale_ends_at"`, `"weight_kg"`, `"low_stock_threshold"`, `"is_active"`. Bila `stock` di PUT berbeda dari stok sekarang → dikonversi jadi movement `adjustment` (bukan update langsung).
- `DELETE /admin/products/:id` → `{"data": {"id","archived": true|false}}`.
- `DELETE /admin/categories/:id` → `409` bila masih punya produk atau subkategori.
- `GET /admin/inventory?q=&low_stock=true&page=` → `[{"variant_id","product_id","product_name","sku","color","size","stock","low_stock_threshold","is_low"}]`.
- `POST /admin/inventory/adjustments` body `{"variant_id","delta","reason": "restock"|"adjustment","note"}` → `{"variant_id","stock","movement_id"}`; `409` bila hasil < 0.
- `GET /admin/inventory/movements?variant_id=&order_id=&page=` → `[{"id","variant_id","sku","delta","stock_after","reason","order_id","order_number","actor_email","note","created_at"}]`.

### 7.3 Domain B

**`<address>`** 🔒 = `{"id","label","recipient","phone","address_line","district","city","province_code","province","postal_code","notes","is_default","created_at"}`
- `GET /addresses` → `{"data": [<address>]}` (default dulu, lalu terbaru; tanpa pagination, maks 20).
- `POST /addresses` body = `<address>` tanpa `id`/`province`/`created_at` → `201 <address>`. Alamat pertama otomatis default. Alamat ke-21 → `409`.
- `PUT /addresses/:id` (ganti penuh) → `<address>`. `DELETE` → `{"id"}`; kalau yang dihapus default, alamat terbaru jadi default.
- `POST /addresses/:id/default` → `<address>`.
- Alamat milik user lain → `404`.

**`GET/PUT /cart`** 🔒, tambahan per item: `"regular_price"`, `"on_sale"`, `"stock"`, `"available"` (false bila varian nonaktif / produk tidak published / stok 0), `"product.product_id"`; tambahan top-level `"item_count"`. `total` hanya menjumlah item `available`.
**`POST /cart/merge`** 🔒 body `{"items": [{"variant_id","qty"}]}` → cart; qty dijumlahkan, maks 99 per baris; varian tak dikenal dilewati.

**`GET /wishlist`** → `[{"product_id","added_at","product": <item listing produk>}]` (maks 200, tanpa pagination). `PUT /wishlist/:id` → `{"product_id","added_at"}` (idempoten). `DELETE /wishlist/:id` → `{"id"}` (idempoten).

**`GET /shipping/provinces`** 🔒 → `[{"code","name","zone_code"}]`. **`GET /store`** 🔒 → `{"store_name","support_email","support_phone","tax_rate_bp","prices_include_tax","return_window_days"}`.

**`POST /orders/:id/pay`** 🔒 → `{"snap_token","midtrans_client_key","expires_at"}`. `409` bila status bukan `pending_payment`.

**Admin**
- `GET /admin/customers?q=&sort=newest|total_spent&page=` → `[{"id","email","full_name","phone","role","orders_count","total_spent","last_order_at","created_at"}]` (`total_spent` = Σ total order paid/processing/shipped/completed).
- `GET /admin/customers/:id` → item di atas + `"addresses": [<address>]`, `"recent_orders": [{"id","order_number","status","total","created_at"}]`.
- `GET/PUT /admin/settings` → seluruh kolom `store_settings` (kecuali `id`).
- `GET /admin/shipping/zones` → `[{"id","code","name","position","is_active","province_codes": [],"methods": [<method>]}]`, `<method>` = `{"id","code","name","rate_type","base_cost","per_kg_cost","max_weight_kg","free_shipping_min_subtotal","eta_min_days","eta_max_days","is_active","position"}`. CRUD sesuai registry; `PUT /zones/:id/provinces` body `{"province_codes": []}` memindahkan provinsi ke zona itu.

### 7.4 Domain C

**`POST /coupons/validate`** 🔒 body `{"code","items": [{"variant_id","qty"}]}` → **selalu 200 untuk hasil bisnis**:
`{"valid": true|false,"reason": null|"not_found"|"inactive"|"not_started"|"expired"|"usage_limit_reached"|"user_limit_reached"|"not_applicable"|"min_subtotal_not_met","code","discount_type","description","items_discount","free_shipping","min_subtotal"}`
**`GET /coupons/public`** → `[{"code","description","discount_type","amount","max_discount","min_subtotal","ends_at"}]` (aktif, publik, dalam jadwal, kuota tersisa).

**Admin**
- `<coupon_admin>` = semua kolom `coupons` + `"description"` (locale aktif) + `"product_ids": []` + `"category_ids": []` + `"used_count"` (reserved+applied).
- `GET /admin/coupons?q=&status=active|scheduled|expired|inactive&page=`, `POST`, `GET/PUT /:id`, `DELETE /:id` (`409` bila sudah pernah dipakai; UI menyarankan nonaktifkan).
- `GET /admin/coupons/:id/redemptions?page=` → `[{"order_id","order_number","user_email","items_discount","shipping_discount","status","created_at"}]`.
- `GET /admin/stats` (aditif): `"today_revenue","today_orders","pending_payment_count","to_ship_count","low_stock_count","pending_reviews_count","open_returns_count"`.
- Laporan (`from`/`to` = tanggal `YYYY-MM-DD` WIB, inklusif; default 30 hari terakhir; order dihitung berdasarkan `paid_at`, status ∈ paid/processing/shipped/completed/refunded):
  - `GET /admin/reports/summary` → `{"gross_sales","discount_total","refunded_total","net_sales","shipping_total","orders_count","items_sold","avg_order_value","new_customers"}`, dengan `net_sales = gross_sales − discount_total − refunded_total` dan `gross_sales = Σ subtotal`.
  - `GET /admin/reports/sales?interval=day|week|month&format=json|csv` → `[{"period": "2026-09-01","orders_count","gross_sales","discount_total","refunded_total","net_sales","shipping_total"}]`; `format=csv` → `text/csv` dengan header kolom yang sama.
  - `GET /admin/reports/top-products?limit=10` → `[{"product_id","slug","name","items_sold","revenue"}]`.

### 7.5 Domain D

**`<order>` v2** 🔒 (aditif terhadap M2):
```json
{
  "id": "…", "order_number": "KRY-260924-000123", "status": "shipped",
  "items": [{
    "id": "…", "variant_id": "…", "product_slug": "taru-work-desk", "thumbnail_url": "https://…",
    "name": "TARU work desk", "sku": "TARU-WD-NAT", "color": "natural", "size": null,
    "qty": 1, "price": 1250000, "regular_price": 1500000, "discount_amount": 125000,
    "subtotal": 1250000, "refunded_qty": 0, "can_review": false, "review_id": null
  }],
  "subtotal": 1250000, "discount_total": 125000, "shipping_cost": 97000,
  "shipping_discount": 0, "tax_amount": 121099, "total": 1222000,
  "coupon_code": "HEMAT10",
  "shipping_method": {"code": "reguler", "name": "Reguler", "eta_min_days": 3, "eta_max_days": 5},
  "shipping_address": {"recipient","phone","address_line","city","province","postal_code","province_code","district"},
  "customer_note": null, "courier": "JNE", "tracking_number": "JNE123…",
  "payment": {"status": "settlement", "can_continue": false, "expires_at": null},
  "can_cancel": false, "can_return": false,
  "paid_at": "…", "shipped_at": "…", "completed_at": null, "cancelled_at": null, "created_at": "…",
  "timeline": [{"status": "paid", "note": null, "actor_type": "payment_gateway", "created_at": "…"}]
}
```
`product_slug`/`thumbnail_url` null bila produk sudah terhapus. `timeline` hanya di detail; `[]` di list. Order lama (sebelum v2): field baru bernilai default (`shipping_method: null`, dst.).

- **`GET /orders?page=1&limit=10&status=`** 🔒 → list `<order>` + meta. `limit` default 10, maks 50; `status` di luar 8 nilai resmi → `400 validation_error`. Maksimal 3 query (orders, items, attempts), **bukan N+1**.
- `POST /orders/:id/cancel` body `{"reason": "…"}` → `<order>`; `409` bila bukan `pending_payment`.
- `POST /orders/:id/returns` body `{"items": [{"order_item_id","qty"}],"reason_code","description"}` → `201 <return>`. `409` bila status bukan `completed`, jendela retur lewat, atau masih ada retur terbuka; `400` bila qty > (qty − refunded_qty).
  `<return>` = `{"id","order_id","order_number","status","reason_code","description","admin_note","items": [{"order_item_id","name","qty"}],"refund": {"amount","created_at"} | null,"created_at","resolved_at"}`. `GET /returns` (list + meta), `GET /returns/:id`.
- `GET /products/:slug/reviews?page=&limit=&rating=&sort=newest|highest|lowest` → `[{"id","rating","title","body","author_name","verified_purchase": true,"variant_label","admin_reply","replied_at","created_at"}]` (approved saja; `author_name` disamarkan: nama depan + inisial).
- `GET /products/:slug/reviews/summary` → `{"rating_avg","rating_count","distribution": [{"rating": 5,"count": 10}, …, {"rating": 1,"count": 0}]}`.
- `GET /me/reviewables` → `[{"order_item_id","order_number","product_slug","name","variant_label","thumbnail_url","completed_at"}]`. `GET /me/reviews` → `[{"id","product_slug","product_name","rating","title","body","status","admin_reply","created_at"}]`.
- `POST /reviews` body `{"order_item_id","rating","title","body"}` → `201`; `409` bila order belum `completed` atau produk sudah diulas. `PUT /reviews/:id` (milik sendiri; status kembali `pending`). `DELETE /reviews/:id`.
- `GET /notifications?page=&unread_only=true` → `[{"id","type","title","body","link","read_at","created_at"}]` + meta. `GET /notifications/unread-count` → `{"count"}`. `POST /notifications/read` body `{"ids": []}` atau `{"all": true}` → `{"updated"}`.

**Admin**
- `GET /admin/orders?status=&q=&from=&to=&page=` (aditif: `q` mencari order_number/email) → `<order>` + `"customer_email"`.
- `GET /admin/orders/:id` → `<order>` + `"customer": {"id","email","full_name"}`, `"notes": [{"id","body","is_customer_visible","author_email","created_at"}]`, `"refunds": [{"id","amount","shipping_amount","reason","restock","items": [{"order_item_id","qty","amount"}],"created_at"}]`, `"payment_attempts": [{"midtrans_order_id","status","expires_at","created_at"}]`, `"refundable_amount"`.
- `PUT /admin/orders/:id/status` body `{"status","note","courier","tracking_number"}` (3 terakhir opsional) → `<order>`. Transisi di luar §6.1 → `409`; `shipped` tanpa kurir/resi → `400`.
- `POST /admin/orders/:id/notes` body `{"body","is_customer_visible"}` → note.
- `POST /admin/orders/:id/refunds` body `{"items": [{"order_item_id","qty"}],"shipping_amount": 0,"reason","restock": true,"return_id": null}` → refund. Nominal item = `qty × (price − floor(discount_amount / qty_awal))` dihitung **server**. `409` bila melebihi `refundable_amount`. Kalau total refund = `orders.total`, status → `refunded`.
- `GET /admin/reviews?status=&rating=&page=`, `PUT /admin/reviews/:id` body `{"status","admin_reply"}`.
- `GET /admin/returns?status=&page=`, `PUT /admin/returns/:id` body `{"status","admin_note"}`; transisi: requested→approved|rejected, approved→received, received→refunded (hanya lewat refund dengan `return_id`), requested→cancelled (oleh customer, di luar v2).

### 7.6 Core / integrator (F2)

**`POST /checkout/quote`** 🔒 body `{"items": [{"variant_id","qty"}],"address_id": null,"province_code": null,"shipping_method_id": null,"coupon_code": null}` (tujuan dari `address_id`, kalau null dari `province_code`, kalau keduanya null tanpa opsi kirim) →
```json
{"lines": [{"variant_id","product_slug","name","color","size","thumbnail_url","qty","unit_price","regular_price","discount_amount","subtotal"}],
 "subtotal": 0, "discount_total": 0,
 "shipping_options": [{"method_id","code","name","cost","eta_min_days","eta_max_days","is_free"}],
 "selected_shipping_method_id": null, "shipping_cost": 0, "shipping_discount": 0,
 "tax_amount": 0, "total": 0, "total_weight_kg": 0,
 "coupon": {"code","valid","reason","discount_type"} ,
 "problems": [{"variant_id","code": "insufficient_stock"|"unavailable","available": 0}]}
```
Quote **tidak pernah 4xx untuk masalah bisnis** (stok, kupon, metode tidak tersedia); semuanya dilaporkan di `problems`/`coupon`. `400` hanya untuk body rusak. `coupon` null bila tidak ada kode. Bila `shipping_method_id` null → dipilih opsi termurah.

**`POST /orders`** 🔒 v2 body `{"items","address_id","shipping_method_id","coupon_code": null,"customer_note": null}` → `201 {"order": <order>,"snap_token","midtrans_client_key"}`. Error: `409` (stok, kupon jadi tidak valid, metode tidak tersedia untuk tujuan), `404` (alamat bukan milik user), `502 payment_error` (Snap gagal → kompensasi: `Release` stok, `Release` kupon, hapus order).
Body M2 lama (`shipping_zone` + `shipping_address`) **dihapus di F2** bersamaan dengan checkout FE v2 (commit yang sama).

**Webhook** tetap `POST /payments/midtrans/notification`; lookup lewat `payment_attempts.midtrans_order_id` (fallback `payments.midtrans_order_id` untuk order pra-v2). Idempoten per attempt; notifikasi dari attempt `superseded` yang ternyata `settlement` **tetap diterima** (user membayar lewat token lama).

---

## 8. Dampak ke sistem lain

| Sistem | Dampak | Tindakan |
|---|---|---|
| FastAPI `services/ai/` (akan dihapus oleh pivot chatbot) | Query langsung ke `products` akan ikut menampilkan produk draft/arsip | Catat di permintaan lintas-teritori AGENT-AI; tidak dikerjakan v2 |
| n8n M5 (abandoned cart) | `carts.items` deprecated → `cart_items` | Beri tahu AGENT-AI sebelum migrasi pembersihan F3 |
| n8n chatbot / `GET /internal/orders/status` | Tidak berubah. Opsional: izinkan pencarian via `order_number` | Permintaan terpisah |
| `cmd/seed` + `data/seed/products.json` | Kontrak seed tidak berubah. Kolom baru memakai default; status → published | A menyesuaikan loader bila perlu (tanpa ubah kontrak file) |
| `e2e/*.spec.ts` | `transaksi.spec.ts` akan rusak saat checkout v2 | Diperbarui integrator di F2 |
| KRIYA-MASTER Bagian 6 & 7 | Kontrak & kepemilikan tabel berubah | Satria merujuk dokumen ini dari master di gerbang G0 (§7 + §5.6 jadi addendum resmi) |
| Endpoint `/profile` (belum ada di kontrak master) | Tetap; bagian alamat di UI pindah ke buku alamat | Diformalkan bersama addendum |

---

## 9. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| CHECK baru gagal karena data lama melanggar | Query verifikasi ⚠ wajib dijalankan sebelum migrasi; kalau ada pelanggaran, berhenti dan lapor |
| Deadlock saat dua checkout mengunci varian & kupon | Kunci varian terurut `variant_id`, lalu kupon; satu transaksi |
| Webhook datang untuk attempt lama setelah lanjut bayar | `payment_attempts` menyimpan semua id; lookup `= midtrans_order_id` di tabel attempts |
| 4 agent memakai satu DB Supabase dev yang sama | Tidak ada DDL di F1; data uji berawalan per agent dan dibersihkan; lihat dokumen eksekusi §2 |
| Refactor F0 mengubah perilaku API tanpa sengaja | Snapshot "golden" respons semua endpoint sebelum refactor, lalu diff setelahnya (task 0D) |
| Enable RLS memutus akses sesuatu yang diam-diam memakai PostgREST | Grep FE untuk `.from(`; hanya Storage admin yang sah. Uji ulang admin upload setelah 008 |
| `kriya_effective_price` dievaluasi `now()` sehingga sale berakhir di tengah checkout | Harga final dihitung di transaksi order; kalau berbeda dari quote, FE menampilkan toast "harga berubah" (order tetap dibuat dengan harga baru, total ada di respons) |

---

## 10. Kriteria selesai program v2 (demo akhir)

1. Admin membuat produk **draft** → tidak tampil di toko → publish → tampil. Arsipkan produk yang pernah dipesan → hilang dari toko, riwayat order tetap utuh.
2. Admin set harga sale terjadwal → kartu produk menampilkan harga coret hanya dalam jadwal.
3. Filter listing material=jati + tag + on_sale bekerja dan bisa dibagikan via URL.
4. User menyimpan 2 alamat → checkout ke alamat Papua → hanya metode yang valid tampil, ongkir sesuai berat.
5. Kupon `HEMAT10` (10%, maks 200rb, min 1jt, kuota 1/user) → diskon benar, dipakai kedua kali ditolak `user_limit_reached`.
6. Tutup popup Snap → dari riwayat, "Lanjutkan pembayaran" → bayar sandbox → status `paid`, kupon `applied`, `total_sales` naik, notifikasi muncul di lonceng.
7. Admin → processing → shipped (resi) → completed; timeline customer menampilkan semua langkah.
8. Customer menulis ulasan → admin setujui → rating PDP & kartu berubah.
9. Customer ajukan retur 1 item → admin setujui → terima → refund dengan restock → stok naik dan tercatat di riwayat inventori; refund penuh → status `refunded`.
10. Laporan 30 hari menampilkan angka yang cocok dengan query manual; CSV terunduh.
11. Seluruh gerbang kualitas hijau: `go build/vet/test`, `tsc --noEmit`, `eslint .` 0 problem, `next build`, seluruh E2E Playwright.

---

## 11. Keputusan pra-F0 (✅ dikunci Satria 2026-09-24 — semua sesuai rekomendasi)

| Kode | Pertanyaan | Keputusan |
|---|---|---|
| O1 | Keputusan turunan D1–D12 (§3.2) | ✅ Disetujui seluruhnya |
| O2 | Angka seed ongkir §5.3.1 | ✅ Dipakai apa adanya; admin bisa mengubah lewat UI |
| O3 | Ulasan dimoderasi atau langsung tayang? | ✅ Dimoderasi (default `pending`, D6) |
| O4 | Siapa yang memverifikasi status RLS tabel commerce (S14)? | ✅ Claude, via MCP Supabase di awal F0, sebelum 0A menulis 008 |
