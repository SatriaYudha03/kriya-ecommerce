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

## Midtrans (Sandbox)

- Snap: buat transaksi via API Snap sandbox dengan `MIDTRANS_SERVER_KEY`; `order_id` format `KRIYA-{8 char acak}` (simpan mapping di `payments.midtrans_order_id`); kembalikan `snap_token` + `MIDTRANS_CLIENT_KEY` di respons order.
- Webhook `POST /api/v1/payments/midtrans/notification`:
  1) verifikasi `signature_key` = SHA-512(`order_id + status_code + gross_amount + ServerKey`) — tolak 403 bila beda;
  2) idempoten (status sama diproses dua kali = no-op);
  3) mapping: `capture`/`settlement` → `paid` · `pending` → `pending_payment` · `deny`/`cancel` → `cancelled` · `expire` → `expired`;
  4) simpan payload mentah ke `payments.raw`.

## Task per milestone

### M0 — Scaffold
- [ ] `go mod init`, struktur folder di atas, `GET /healthz` → `{"data":{"status":"ok"}}`
- [ ] Koneksi DB (`SUPABASE_DB_URL`), middleware CORS (`WEB_ORIGIN`) + auth + internal-key
- [ ] Dockerfile multi-stage (build → distroless/alpine)

### M1 — Katalog
- [ ] Migrasi `001_commerce_core.sql`: profiles (+ trigger dari auth.users, kolom role default 'customer'), categories, products, product_variants, product_images, assembly_guides — kolom sesuai master Bagian 7
- [ ] Seed loader `cmd/seed/main.go`: baca `data/seed/products.json` (kontrak master Bagian 6) → upsert kategori, produk, varian, gambar; idempoten (berdasar slug/sku)
- [ ] `GET /categories`, `GET /products` (filter + sort + pagination), `GET /products/{slug}` — bentuk respons persis kontrak

### M2 — Transaksi
- [ ] Migrasi `002_orders.sql`: carts (user_id unik, items jsonb, followed_up_at), orders (status, subtotal, shipping_cost, total, shipping_address jsonb, reminded_at), order_items, payments
- [ ] `GET/PUT /cart` (hitung ulang harga tiap PUT)
- [ ] `POST /orders` (validasi stok + reservasi dalam transaksi, ongkir flat per zona, buat Snap token), `GET /orders`, `GET /orders/{id}` (hanya milik user)
- [ ] Webhook Midtrans sesuai spesifikasi di atas + test unit verifikasi signature
- [ ] `GET /internal/orders/status` (internal-key; dipakai chatbot)

### M5 — Dukungan otomasi
- [ ] Pastikan kolom n8n-writable ada & terindeks (`carts.followed_up_at`, `orders.reminded_at`); tambah yang diminta Satria dari kebutuhan AI agent

### M6 — Admin (kontrak final di gerbang M6)
- [ ] Middleware role admin (cek `profiles.role`)
- [ ] CRUD produk/varian/stok + list semua order + update status

## Definition of done (setiap task)
`go build ./...` + `go vet` hijau, endpoint teruji minimal via curl (tulis contohnya di commit message), migrasi jalan bersih di DB kosong, tidak menyentuh file di luar teritori, log terisi.

## Larangan spesifik
Jangan sentuh `apps/web/`, `services/ai/`, `data/`, `automation/`. Jangan membuat/mengubah tabel `documents` atau fungsi vector (milik AGENT-AI). Jangan `AutoMigrate`. Jangan log secret/JWT. Jangan mengubah bentuk respons dari kontrak — kalau kontrak terasa salah, ajukan lewat "Permintaan lintas-teritori".

## Permintaan lintas-teritori
(tulis di sini, format: tanggal — kebutuhan — alasan; lalu berhenti dan tunggu Satria)

## Log
(append satu baris per sesi: `2026-07-06 · [be] task · status/catatan`)
