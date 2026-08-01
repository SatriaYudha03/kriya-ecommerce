# Rencana: Penyempurnaan Riwayat Pembelian (Order History)

**Status:** 🟡 **RENCANA — belum dieksekusi.** Disimpan untuk dikerjakan sesi lain.
**Tanggal:** 2026-08-01
**Pengaju:** AGENT-FE — **lintas-teritori** (Fase 1 & 2 butuh AGENT-BE + perubahan kontrak KRIYA-MASTER Bagian 6).
**Pemilik keputusan:** Satria (lihat Bagian 7 — ada 4 keputusan yang harus dikunci sebelum eksekusi).

---

## 1. Temuan: fiturnya SUDAH ADA (versi dasar)

Riwayat pembelian **sudah jalan end-to-end** sejak M2. Yang ada sekarang:

| Lapis | Berkas | Isi |
|---|---|---|
| Halaman daftar | `apps/web/app/(store)/orders/page.tsx` | Kartu per order: ID pendek, badge status, tanggal, total, jumlah macam produk, link detail |
| Halaman detail | `apps/web/app/(store)/orders/[id]/page.tsx` | Alamat kirim, rincian biaya, tabel item, polling 10 dtk saat `pending_payment` |
| Hook | `apps/web/lib/queries.ts:38-53` | `useOrders()` + `useOrder(id)`, `queryKey` sudah menyertakan `locale` |
| Fetcher | `apps/web/lib/api.ts:209-221` | `getOrders()` / `getOrder(id)`, `auth: true` |
| Navigasi | `components/kriya/site-header.tsx:85,212` | Menu "Pesanan saya" (desktop + mobile), key i18n `nav.orders` |
| API | `services/api/internal/handler/order.go:111-164` | `GET /api/v1/orders`, `GET /api/v1/orders/{id}` |
| Repo | `services/api/internal/repository/order.go:219-241` | `ListByUser` (urut `created_at DESC`), `GetByIDForUser`, `GetItemsByOrderID` |
| Kontrak | `docs/KRIYA-MASTER.md:112-113` | Bentuk `<order>` sudah terkunci |
| Sisi admin | `app/(admin)/admin/orders/page.tsx` | Sudah punya filter status + pagination (customer belum) |

**Kesimpulan: tidak perlu dirancang dari nol.** Yang dibutuhkan adalah pematangan. Bagian 2 di bawah adalah gap yang sudah diverifikasi langsung di kode, bukan dugaan.

---

## 2. Gap yang terverifikasi

| # | Gap | Bukti | Dampak |
|---|---|---|---|
| G1 | **Tidak ada auth guard.** Buka `/orders` tanpa login → API balas 401 → `orders` jadi `undefined` → halaman menampilkan empty state **"Belum ada pesanan"** | `orders/page.tsx:32` hanya cek `!orders \|\| length === 0`; `isError` tidak ditangani; tidak ada `middleware.ts` di `apps/web/` | 🔴 Menyesatkan. User merasa datanya hilang |
| G2 | **Belum di-i18n.** Seluruh teks kedua halaman hard-coded Bahasa Indonesia | `orders/page.tsx:11-17,30,38-47,54,72,80,86`; `[id]/page.tsx:13-19,46-47,53,63,66,76,88,100,108,113-116` | 🔴 Regresi terhadap kerja i18n M-terakhir (commit `b4a77df`, `63c0e42`). Ganti ke EN, halaman ini tetap ID |
| G3 | **`StatusBadge` triplikat.** Peta label status ditulis ulang 3× dengan isi identik | `orders/page.tsx:10-18`, `[id]/page.tsx:13-21`, `admin/orders/page.tsx:9-17` | 🟡 Tiap tambah status harus edit 3 berkas |
| G4 | **N+1 query + tanpa pagination.** `ListOrders` mengambil SEMUA order user, lalu query item **per order** di dalam loop | `handler/order.go:122-132` | 🟡 Sekarang aman (DB live cuma **2 order**), tapi `docs/seed-orders-plan.md` akan menambah 100 → 1 + 100 round-trip per buka halaman |
| G5 | **Tidak ada filter / sort / pencarian** di sisi customer | `ListByUser` hanya `Order("created_at DESC")` | 🟡 Admin sudah punya, customer belum |
| G6 | **Riwayat tanpa gambar & tanpa link balik ke produk.** `OrderItemResponse` cuma `name/color/size/qty/price/subtotal` | `model/response.go:142-149` | 🟡 Riwayat terasa "kering"; user tidak bisa klik ke produknya |
| G7 | **Order `pending_payment` tidak bisa dilanjutkan bayar.** `snap_token` hanya dikembalikan sekali di respons `POST /orders` dan tidak disimpan | `handler/order.go:103-107`; `payments` tidak punya kolom `snap_token` (`002_orders.sql`) | 🔴 Tutup popup Snap = order nyangkut permanen. Polling 10 dtk di `[id]/page.tsx:36-44` jadi sia-sia karena tak ada tombol bayar |
| G8 | **Tidak ada aksi lanjutan:** beli lagi, batalkan pesanan, unduh struk, lacak resi | Tidak ada endpoint terkait di `cmd/api/main.go:72-74`; tidak ada kolom resi di skema `orders` | 🟡 |
| G9 | **Nomor pesanan tidak manusiawi.** Ditampilkan 8 karakter hex pertama UUID | `orders/page.tsx:62`, `[id]/page.tsx:63` | 🟢 `payments.midtrans_order_id` sudah berpola `KRIYA-XXXXXXXX` tapi tidak pernah ditampilkan |
| G10 | **`order_items` di-snapshot pada locale saat checkout.** Ganti bahasa setelah order dibuat → nama produk tetap bahasa lama | `repository/order.go:159,165-166`; dicatat sebagai sisa di `RENCANA-I18N-KONTEN-PRODUK.md` | 🟢 Ini **kemungkinan benar** (invoice = dokumen snapshot), tapi harus jadi keputusan sadar → lihat K4 |

---

## 3. Fase 0 — FE-only, tanpa ubah kontrak (bisa dikerjakan AGENT-FE sendirian)

Menyelesaikan G1, G2, G3, G9. Tidak menyentuh Go, tidak menyentuh DB, tidak mengubah KRIYA-MASTER.

### 0a. Auth guard + pembedaan error vs kosong
- Tambah `apps/web/middleware.ts` yang melindungi `/orders`, `/orders/:id`, `/profile`, `/checkout` — cek cookie sesi Supabase, kalau kosong `redirect('/login?next=' + pathname)`.
  ⚠️ **Baca `node_modules/next/dist/docs/` dulu** (lihat `apps/web/AGENTS.md`) — API middleware di versi Next.js repo ini bisa berbeda dari yang kamu hafal.
- Di halaman: tangani tiga keadaan terpisah — `isLoading` (skeleton), `isError` + `ApiError.status === 401` (ajakan login), `isError` lain (pesan gagal muat + tombol "Coba lagi" → `refetch()`), baru `length === 0` (empty state asli).

### 0b. i18n dua halaman
Tambah ~30 key ke `lib/i18n/messages/id.ts` **dan** `en.ts` (dua berkas ini wajib sinkron, sekarang sama-sama 189 baris). Usulan namespace `orders.*`:

```
orders.title, orders.empty.title, orders.empty.body, orders.empty.cta,
orders.loading, orders.error.title, orders.error.retry, orders.error.login,
orders.card.total, orders.card.itemCount, orders.card.detail,
orders.detail.back, orders.detail.number, orders.detail.createdAt,
orders.detail.shippingAddress, orders.detail.costSummary,
orders.detail.subtotal, orders.detail.shippingCost, orders.detail.total,
orders.detail.items, orders.th.product, orders.th.price, orders.th.qty, orders.th.subtotal,
orders.status.pending_payment ... orders.status.expired   (7 key)
```

Tanggal: ganti `toLocaleDateString("id-ID", …)` yang di-hardcode (`orders/page.tsx:66`, `[id]/page.tsx:66`) jadi mengikuti `locale` dari `useLanguage()`.

### 0c. Ekstrak `StatusBadge`
Berkas baru `components/kriya/order-status-badge.tsx` — satu sumber kebenaran untuk peta warna + label ber-i18n. Dipakai 3 halaman (termasuk admin). Kelas warna dipertahankan persis seperti sekarang supaya tidak ada perubahan visual yang tak disengaja.

### 0d. Nomor pesanan
Tampilkan `midtrans_order_id` (pola `KRIYA-XXXXXXXX`) sebagai nomor pesanan — **butuh field baru di respons**, jadi item ini turun ke Fase 1. Untuk Fase 0 cukup rapikan jadi `#{id.slice(0,8).toUpperCase()}` supaya konsisten dan bisa disalin.

**Perkiraan:** 1 sesi. Tidak ada risiko regresi ke BE.

---

## 4. Fase 1 — Perubahan kontrak (butuh AGENT-BE + Satria mengunci Bagian 6)

Menyelesaikan G4, G5, G6, G9. **Semua tambahan bersifat aditif** — field lama tidak dihapus/diubah tipe, jadi FE lama tetap jalan.

### 1a. `GET /api/v1/orders` jadi ber-pagination
Usulan kontrak baru (menggantikan `KRIYA-MASTER.md:112`):

```
GET /api/v1/orders?lang=en|id&page=1&limit=10&status=<opsional>
→ {"data": [<order>], "meta": {"total": 102, "page": 1, "limit": 10}}
```

- Default `page=1`, `limit=10`, `limit` maksimum 50.
- `status` opsional, harus salah satu dari 7 status resmi; nilai lain → 400 `validation_error`.
- Bentuk envelope mengikuti pola yang **sudah dipakai admin** (`ListEnvelope` di `lib/types.ts`, `AdminOrdersQuery`) — tidak menciptakan pola baru.
- ⚠️ **Breaking change:** `data` tetap array, tapi FE harus mulai membaca `meta`. `lib/api.ts:210` dan `useOrders()` ikut berubah → satu commit FE+BE bersamaan, atau BE dulu (FE lama mengabaikan `meta` dengan aman).

### 1b. Perbaiki N+1
Ganti loop di `handler/order.go:122-132` dengan satu query `WHERE order_id IN (…)` lalu kelompokkan di memori (`map[string][]OrderItem`). Dari `1+N` jadi `2` query.

### 1c. Perkaya `OrderItemResponse`
```go
type OrderItemResponse struct {
    Name         string  `json:"name"`
    Color        string  `json:"color"`
    Size         *string `json:"size"`
    Qty          int     `json:"qty"`
    Price        int     `json:"price"`
    Subtotal     int     `json:"subtotal"`
    VariantID    string  `json:"variant_id"`     // BARU — prasyarat "Beli lagi"
    ProductSlug  string  `json:"product_slug"`   // BARU — link balik ke produk
    ThumbnailURL string  `json:"thumbnail_url"`  // BARU — riwayat bergambar
}
```
`order_items` sudah menyimpan `variant_id` (`repository/order.go:49`), jadi `slug` + `thumbnail_url` didapat lewat JOIN `product_variants → products → product_images` saat baca. **Sengaja tidak di-snapshot** — kalau produk dihapus, JOIN jadi `NULL` dan FE menampilkan placeholder tanpa link (nama/harga tetap dari snapshot, jadi invoice tidak berubah).

### 1d. Tambah `midtrans_order_id` ke `OrderResponse`
Field `"order_number"` (string) diambil dari `payments.midtrans_order_id`. Menyelesaikan G9 dengan benar.

### 1e. FE menyusul
- `useOrders({page, status})` + kontrol filter status & tombol "Muat lebih banyak" (atau pagination angka, samakan dengan admin).
- Thumbnail 56×56 di kartu daftar + tabel detail; nama item jadi `<Link href={/products/${slug}}>` bila `product_slug` ada.

---

## 5. Fase 2 — Fitur lanjutan (butuh skema DB baru + keputusan Satria)

### 2a. Lanjutkan pembayaran (G7 — prioritas tertinggi di fase ini)
Masalahnya nyata: Midtrans **menolak `order_id` yang sudah pernah dipakai**, jadi tidak bisa asal panggil ulang Snap.

**Rancangan:**
- Migrasi `008_order_history.sql`: `ALTER TABLE payments ADD COLUMN snap_token text, ADD COLUMN snap_expires_at timestamptz;` — isi saat `CreateOrder`.
- Endpoint baru `POST /api/v1/orders/{id}/pay` (auth, milik user sendiri):
  - order bukan `pending_payment` → 409 `conflict`.
  - `snap_token` masih ada & `snap_expires_at > now()` → kembalikan token tersimpan.
  - sudah kedaluwarsa → buat `midtrans_order_id` baru (pola `KRIYA-XXXXXXXX-R1`, `-R2`, …), panggil Snap lagi, `UPDATE payments`.
  - → `{"data": {"snap_token", "midtrans_client_key"}}`
- ⚠️ **Konsekuensi webhook:** `ApplyPaymentUpdate` mencari baris `payments` lewat `midtrans_order_id` (`repository/order.go:288-289`). Kalau kolom itu ditimpa, notifikasi telat untuk order_id **lama** jadi `ErrPaymentNotFound`. Mitigasi: simpan riwayat id di kolom `midtrans_order_ids text[]` dan cari dengan `= ANY(...)`, atau bikin tabel `payment_attempts`. **Ini harus diputuskan bersama AGENT-BE — jangan dieksekusi tanpa itu.**
- FE: tombol "Lanjutkan pembayaran" di kartu daftar & halaman detail untuk status `pending_payment`, memuat ulang Snap persis seperti `checkout/page.tsx:108-113`.

### 2b. Beli lagi (reorder)
Murni FE **setelah** `variant_id` tersedia dari 1c: tombol "Beli lagi" → `PUT /api/v1/cart` berisi item order tersebut → redirect `/cart`. Varian yang stoknya habis dilewati dengan toast peringatan (server sudah memvalidasi stok saat checkout, jadi tidak ada jalur yang tidak aman).

### 2c. Batalkan pesanan
`POST /api/v1/orders/{id}/cancel` — **hanya** untuk status `pending_payment` (setelah dibayar, pembatalan urusan admin/refund, di luar cakupan). Pakai ulang pengembalian stok yang logikanya sudah ada di `CompensateFailedOrder` (`repository/order.go:248-262`), set `orders.status='cancelled'` + `payments.transaction_status='cancel'`, dan panggil Midtrans cancel API supaya tidak ada pembayaran nyasar. FE: dialog konfirmasi.

### 2d. Lacak resi
Migrasi: `ALTER TABLE orders ADD COLUMN courier text, ADD COLUMN tracking_number text;` Admin mengisinya saat mengubah status ke `shipped` (`admin/orders/page.tsx` + `PUT /admin/orders/{id}/status`). Ditampilkan di halaman detail dengan tombol salin. Integrasi API kurir sungguhan **di luar cakupan** — cukup tampilkan nomornya.

### 2e. Struk / invoice
Paling murah: halaman `/orders/[id]/invoice` yang siap-cetak (CSS `@media print`) + tombol "Cetak / Simpan PDF" memanggil `window.print()`. **Tanpa** library PDF, tanpa endpoint baru. Kalau nanti perlu PDF sungguhan, itu kerjaan BE terpisah.

---

## 6. Berkas yang tersentuh

**Fase 0 (FE)**
- Baru: `apps/web/middleware.ts`, `apps/web/components/kriya/order-status-badge.tsx`
- Ubah: `app/(store)/orders/page.tsx`, `app/(store)/orders/[id]/page.tsx`, `app/(admin)/admin/orders/page.tsx` (pakai badge bersama), `lib/i18n/messages/id.ts`, `lib/i18n/messages/en.ts`

**Fase 1 (BE + FE)**
- Ubah: `services/api/internal/handler/order.go`, `internal/repository/order.go`, `internal/model/response.go`, `apps/web/lib/api.ts`, `lib/queries.ts`, `lib/types.ts`, `app/(store)/orders/*`
- Ubah dokumen: `docs/KRIYA-MASTER.md` Bagian 6 baris 112-113

**Fase 2 (BE + DB + FE)**
- Baru: `supabase/migrations/008_order_history.sql`, `app/(store)/orders/[id]/invoice/page.tsx`
- Ubah: `services/api/cmd/api/main.go` (3 rute baru), `handler/order.go`, `repository/order.go`, `internal/service/midtrans.go`, `app/(admin)/admin/orders/page.tsx`

---

## 7. Keputusan yang harus dikunci Satria dulu

| Kode | Pertanyaan | Rekomendasi |
|---|---|---|
| **K1** | Kerjakan Fase 0 saja dulu, atau langsung 0+1? | **Fase 0 dulu.** G1 & G2 adalah bug yang terlihat user dan bisa diperbaiki tanpa menyentuh BE/kontrak |
| **K2** | Pagination sekarang atau tunggu `seed-orders-plan.md` dijalankan? | **Barengan dengan seed.** Dengan 2 order, pagination adalah kode mati yang tak teruji; dengan 102 order, langsung terverifikasi |
| **K3** | Fase 2a (lanjut bayar) — timpa `midtrans_order_id` atau bikin tabel `payment_attempts`? | **Perlu jawaban AGENT-BE.** Menimpa itu lebih sederhana tapi ada lubang webhook telat (lihat 2a) |
| **K4** | Nama item riwayat: tetap snapshot bahasa saat checkout (G10), atau ikut bahasa aktif? | **Tetap snapshot.** Riwayat pembelian itu dokumen transaksi; harga pun sudah di-snapshot, jadi nama seharusnya konsisten. Kalau Satria mau ikut bahasa aktif, sumber datanya harus `variant_id` (sudah tersedia lewat 1c) |

---

## 8. Verifikasi (bahan AGENT-QA)

**Fase 0**
1. Logout → buka `/orders` → **harus** redirect ke `/login?next=/orders`, bukan tampil "Belum ada pesanan".
2. Login dengan akun tanpa order → empty state asli.
3. Matikan API Gin → buka `/orders` → tampil error + tombol "Coba lagi" yang benar-benar refetch.
4. Ganti bahasa ke EN di `/orders` dan `/orders/{id}` → **seluruh** teks UI jadi EN; format tanggal ikut EN. Nama produk di item mengikuti keputusan K4.
5. `grep -c "" lib/i18n/messages/id.ts en.ts` → jumlah baris tetap sama; tidak ada key yang cuma ada di satu berkas.
6. Badge status: warna & label 7 status identik dengan sebelumnya di ketiga halaman.

**Fase 1**
7. `GET /orders?limit=10` dengan 102 order → 10 item + `meta.total = 102`; `page=11` → array kosong, bukan 500.
8. `limit=999` → di-clamp ke 50. `status=ngawur` → 400 `validation_error`.
9. Aktifkan log query DB → buka daftar order → **2 query**, bukan 101.
10. Order berisi produk yang sudah dihapus → item tetap tampil (nama/harga dari snapshot), tanpa link, thumbnail placeholder — tidak crash.

**Fase 2**
11. Checkout → tutup popup Snap → buka `/orders/{id}` → tombol "Lanjutkan pembayaran" ada dan token-nya jalan.
12. Kirim webhook Midtrans dua kali untuk id yang sama → tetap idempoten (perilaku `ApplyPaymentUpdate` sekarang tidak boleh berubah).
13. Batalkan order `pending_payment` → stok varian **kembali persis** seperti sebelum order; batalkan yang `paid` → 409.
14. "Beli lagi" pada order lama → keranjang terisi; varian stok 0 dilewati dengan peringatan.
