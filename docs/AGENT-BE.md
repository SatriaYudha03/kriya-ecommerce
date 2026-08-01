# AGENT-BE — Backend Commerce KRIYA (Gin)

Kamu adalah agent backend commerce. Baca `KRIYA-MASTER.md` dulu (kontrak Bagian 6, skema Bagian 7). Teritorimu: **`services/api/`** dan **`supabase/migrations/` khusus tabel commerce.**

## Stack & aturan teknis

- Go terbaru stabil, Gin, GORM **hanya sebagai model/ORM runtime** — skema TIDAK dibuat GORM. `AutoMigrate` DILARANG; semua perubahan skema lewat file `supabase/migrations/NNN_deskripsi.sql` (pull dulu, nomor = max + 1).
- Struktur standar:
  ```
  services/api/
    cmd/api/main.go
    internal/config      # env
    internal/middleware  # auth JWT, CORS, internal-key
    internal/handler     # HTTP layer, validasi input
    internal/service     # logika bisnis
    internal/repository  # akses DB (GORM)
    internal/model       # struct + json tag snake_case
  ```
- Semua respons memakai envelope & kode error dari master Bagian 5. JSON tag **snake_case** di semua struct.
- Auth middleware: verifikasi JWT Supabase (HS256, `SUPABASE_JWT_SECRET`), ambil `sub` sebagai user_id. Middleware `X-Internal-Key` untuk endpoint internal.
- **Harga dan total SELALU dihitung server** dari tabel varian — jangan pernah percaya harga dari client.
- Stok: cek + reservasi (kurangi) dalam **satu transaksi DB** saat order dibuat; kembalikan saat webhook `expire`/`cancel`.
- **`interface{}` / `any` DILARANG untuk payload berkontrak** (master Bagian 5). Setiap request/response body punya struct di `internal/model` dengan tag json snake_case — termasuk body webhook Midtrans dan payload internal. `map[string]interface{}` bukan pengganti struct.
  - Pengecualian sah, satu-satunya: kolom yang memang menyimpan payload mentah pihak ketiga (`payments.raw`) → pakai `json.RawMessage`, bukan `map[string]interface{}`.
  - Butuh perilaku lintas-tipe → pakai generic Go, bukan `any`.

## Midtrans (Sandbox)

- Snap: buat transaksi via API Snap sandbox dengan `MIDTRANS_SERVER_KEY`; `order_id` format `KRIYA-{8 char acak}` (simpan mapping di `payments.midtrans_order_id`); kembalikan `snap_token` + `MIDTRANS_CLIENT_KEY` di respons order.
- Webhook `POST /api/v1/payments/midtrans/notification`:
  1) verifikasi `signature_key` = SHA-512(`order_id + status_code + gross_amount + ServerKey`) — tolak 403 bila beda;
  2) idempoten (status sama diproses dua kali = no-op);
  3) mapping: `capture`/`settlement` → `paid` · `pending` → `pending_payment` · `deny`/`cancel` → `cancelled` · `expire` → `expired`;
  4) simpan payload mentah ke `payments.raw`.

## Task per milestone

### M0 — Scaffold
- [x] `go mod init`, struktur folder di atas, `GET /healthz` → `{"data":{"status":"ok"}}`
- [x] Koneksi DB (`SUPABASE_DB_URL`), middleware CORS (`WEB_ORIGIN`) + auth + internal-key
- [x] Dockerfile multi-stage (build → distroless/alpine)

### M1 — Katalog
- [x] Migrasi `001_commerce_core.sql`: profiles (+ trigger dari auth.users, kolom role default 'customer'), categories, products, product_variants, product_images, assembly_guides — kolom sesuai master Bagian 7
- [x] Seed loader `cmd/seed/main.go`: baca `data/seed/products.json` (kontrak master Bagian 6) → upsert kategori, produk, varian, gambar; idempoten (berdasar slug/sku)
- [x] `GET /categories`, `GET /products` (filter + sort + pagination), `GET /products/{slug}` — bentuk respons persis kontrak

### M2 — Transaksi
- [x] Migrasi `002_orders.sql`: carts (user_id unik, items jsonb, followed_up_at), orders (status, subtotal, shipping_cost, total, shipping_address jsonb, reminded_at), order_items, payments
- [x] `GET/PUT /cart` (hitung ulang harga tiap PUT)
- [x] `POST /orders` (validasi stok + reservasi dalam transaksi, ongkir flat per zona, buat Snap token), `GET /orders`, `GET /orders/{id}` (hanya milik user)
- [x] Webhook Midtrans sesuai spesifikasi di atas + test unit verifikasi signature
- [x] `GET /internal/orders/status` (internal-key; dipakai chatbot)

### M5 — Dukungan otomasi
- [x] Pastikan kolom n8n-writable ada & terindeks (`carts.followed_up_at`, `orders.reminded_at`); tambah yang diminta Satria dari kebutuhan AI agent

### M6 — Admin (kontrak final di gerbang M6)
- [x] Middleware role admin (cek `profiles.role`)
- [x] CRUD produk/varian/stok + list semua order + update status

## Definition of done (setiap task)
`go build ./...` + `go vet` hijau, endpoint teruji minimal via curl (tulis contohnya di commit message), migrasi jalan bersih di DB kosong, tidak menyentuh file di luar teritori, log terisi.

## Larangan spesifik
Jangan sentuh `apps/web/`, `services/ai/`, `data/`, `automation/`. Jangan membuat/mengubah tabel `documents` atau fungsi vector (milik AGENT-AI). Jangan `AutoMigrate`. Jangan log secret/JWT. Jangan memakai `interface{}`/`any`/`map[string]interface{}` untuk payload berkontrak (master Bagian 5). Jangan mengubah bentuk respons dari kontrak — kalau kontrak terasa salah, ajukan lewat "Permintaan lintas-teritori".

## Permintaan lintas-teritori
(tulis di sini, format: tanggal — kebutuhan — alasan; lalu berhenti dan tunggu Satria)

## Log
(append satu baris per sesi: `2026-07-06 · [be] task · status/catatan`)
2026-07-06 · [be] task M1 · Migrasi tabel commerce, seed loader, dan endpoint katalog selesai
2026-07-06 · [be] audit M0+M1 + fix bug URL gambar · thumbnail_url/images[].url sebelumnya mengembalikan storage_path mentah; dibangun jadi URL publik Supabase Storage penuh (internal/storage/url.go). Housekeeping: hapus kriya-api.exe dari git, gitignore *.exe, perbaiki AGENT-BE.md yang tersimpan UTF-16 di tengah file. checklist M0/M1 dicentang setelah diverifikasi (go build/vet hijau, endpoint dites via curl).
2026-07-06 · [be] task M2 · Migrasi `002_orders.sql` (carts, orders, order_items, payments), GET/PUT /cart, POST/GET /orders + /orders/{id}, webhook Midtrans (verifikasi signature SHA-512 + idempoten + restore stok) dengan unit test, GET /internal/orders/status — selesai. Ditemukan & diperbaiki saat smoke test: order gagal dibuat snap token (mis. Midtrans down) sebelumnya meninggalkan stok tereservasi permanen + order "pending_payment" tanpa cara bayar; ditambah `CompensateFailedOrder` (restore stok + hapus order) sebagai rollback. Diverifikasi end-to-end via curl dengan JWT & user asli (cart isi/hitung ulang harga, order sukses & gagal, stok tidak cukup → 409, webhook settlement/expire/idempoten, internal status 403/404) — data uji sudah dibersihkan. `go build`, `go vet`, `go test` hijau.
2026-07-08 · [be] task M6 Admin · Scaffold middleware AdminGuard selesai (internal/middleware/admin.go). Middleware siap digabungkan dengan validasi token JWT role dari profil DB nantinya.
2026-07-08 · [be] task M6 · Middleware role admin (lookup `profiles.role`), CRUD produk, CRUD varian (dengan pencegahan menghapus varian terakhir produk), list pesanan admin, pembaruan status pesanan admin (dengan logic pengembalian stok jika dibatalkan/expired) selesai. `go build`, `go vet`, `go test` hijau.
2026-07-08 · [be] task M5 · Migrasi `003_automation_indexes.sql` untuk menambahkan index pada kolom n8n-writable (`carts.followed_up_at` dan `orders.reminded_at`) selesai.
2026-07-12 · [be] fitur Profil (data diri + alamat default) · Migrasi `005_profile_fields.sql` (kolom full_name/phone/address_line/city/province/postal_code di `profiles`, nullable, idempoten `IF NOT EXISTS`) + endpoint GET/PUT `/api/v1/profile` (auth) via repository/handler/model baru. Envelope `{data}` & snake_case sesuai kontrak; PUT replace penuh 6 kolom lewat map Updates — `role`/`id` tidak pernah tersentuh. Diverifikasi end-to-end (curl + JWT HS256 legacy): 401 tanpa token, GET kosong, PUT simpan+echo, GET persist, full-replace. `go build`/`vet`/`test` hijau. Data uji dibersihkan. Sesi lintas-teritori (FE+BE+QA) atas arahan Satria. Catatan: endpoint `/profile` belum ada di kontrak master Bagian 6 — perlu diformalkan Satria.
2026-07-12 · [be] M6 admin (selesai penuh) · Endpoint stats, list produk admin (detail + gambar), list & update status pesanan admin, CRUD produk/varian/gambar lengkap; migrasi `006_admin_storage.sql` (fungsi `is_admin()` SECURITY DEFINER + policy insert/select/update/delete `storage.objects` bucket `products` khusus admin, agar FE bisa upload gambar langsung ke Storage — pengecualian yang diizinkan di M6). Perbaikan: izinkan stok varian 0 saat create, `CreateProduct` kembalikan `{id}` saja (bukan objek produk penuh). Diverifikasi end-to-end via curl: JWT admin asli dari Supabase Auth (ES256 via JWKS) → `/admin/stats`+`/admin/orders` 200; JWT customer → 403; tanpa token → 401; roundtrip create (varian stok 0) → detail → tambah gambar → hapus gambar → hapus produk, semua sesuai kontrak. `go build`/`vet` hijau. Data uji dibersihkan. Sesi lintas-teritori atas arahan Satria.
2026-07-12 � [be] Fase 3 Rencana Multi-bahasa � selesai � tambahkan migration 007 untuk kolom _i18n, update read endpoints (catalog, cart, order) untuk mem-parse field berdasarkan ?lang atau Accept-Language fallback.
