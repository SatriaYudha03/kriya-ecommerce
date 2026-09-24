# Rencana i18n Konten Produk — Opsi A (seed dwibahasa + simpan)

**Status:** ✅ **DIEKSEKUSI 2026-07-12** (data layer live) · **pemilik keputusan: Satria**
**Tanggal keputusan:** 2026-07-12 — Satria memilih **Opsi A**.
**Pengaju:** AGENT-FE (lintas-teritori; FE sudah siap, lihat Bagian 5).

> **Catatan eksekusi (2026-07-12):** Ternyata infrastruktur BE untuk Opsi A **sudah ada** — migrasi `007_i18n_content.sql` (kolom `*_i18n` jsonb) + handler catalog sudah memilih locale via `getI18nString`/`getI18nArray`. Yang kurang hanya **data terjemahan asli**: seed loader lama memalsukan ID dengan menambah akhiran `" (ID)"`. Yang dikerjakan sesi ini: (1) `data/seed/translations-id.json` — overlay terjemahan ID (6 kategori, 7 warna, 12 material, 60 produk name+deskripsi) ditulis manual (bukan Gemini, sesuai arahan Satria); (2) `services/api/cmd/seed/main.go` — loader membaca overlay + fallback ke EN (hapus hack `" (ID)"`), alt gambar diturunkan dari nama ID; (3) backfill DB live via MCP (categories, products name/description/materials, variant color, image alt). Verifikasi: 0 field tersisa tak-tertranslate. **Nama merek dipertahankan** (mis. "TAMU sofa" → "Sofa TAMU"). Sisa opsional (belum dikerjakan): `order_items` & `assembly_guides` konten belum di-i18n-kan (tidak tampil di halaman produk).

---

## 1. Keputusan & prinsip

Konten produk (nama, deskripsi, material, dst.) **diterjemahkan SEKALI saat data dibuat, lalu DISIMPAN dwibahasa** di DB. Saat request, server tinggal **memilih** kolom/bahasa sesuai `lang` — tidak ada penerjemahan on-the-fly, tidak ada biaya/latency per request.

Ini **selaras dengan kontrak yang sudah ada**: KRIYA-MASTER Bagian 6 sudah menuliskan *"Server memilih locale untuk field …"* dan *"bentuk respons tetap (`name` = string)"*. Artinya **kontrak respons API TIDAK perlu diubah** — yang perlu dilengkapi hanya (a) kontrak file seed dan (b) skema DB, yang saat ini masih satu bahasa.

Prinsip kualitas: gunakan **Gemini** (sudah ada di stack, `GEMINI_API_KEY`) untuk menulis natif EN+ID, bukan terjemah mentah. **Nama merek/proper JANGAN diterjemahkan penuh** — pertahankan nama produk (mis. "TARU"), terjemahkan hanya bagian generik ("work desk" → "meja kerja").

---

## 2. Keputusan bentuk yang harus DIKUNCI Satria dulu

Sebelum kode ditulis, Satria mengunci dua bentuk berikut (rekomendasi ditandai ✅):

**(a) Bentuk field teks di `data/seed/products.json`** — jadikan dwibahasa:
- ✅ Objek per field: `"name": {"id": "Meja kerja TARU", "en": "TARU work desk"}`
- Alternatif: dua field bersuffiks `"name_id"` / `"name_en"`

**(b) Skema penyimpanan di DB (Bagian 7):**
- ✅ Kolom terpisah per bahasa: `name_id`, `name_en`, `description_id`, `description_en`, dst. (mudah di-index & di-query)
- Alternatif: satu kolom `JSONB` berisi `{"id": "...", "en": "..."}`

> Catatan: apa pun pilihannya, **respons API tetap flat string** sesuai Bagian 6. Dwibahasa hanya ada di seed + DB (internal), tidak bocor ke bentuk respons.

---

## 3. Field yang wajib dwibahasa (dari kontrak Bagian 6)

| Entitas | Field teks yang dilokalkan |
|---|---|
| `categories` | `name` |
| `products` | `name`, `description`, `materials[]` |
| `product_variants` | `color`, `size` |
| `product_images` | `alt` |
| `orders` (item) | `name`, `color`, `size` (turunan dari produk/varian) |

**TIDAK** dilokalkan (netral-bahasa, biarkan apa adanya): `slug`, `id`, `sku`, `price`, `stock`, `thumbnail_url`, `dimensions.*`, `weight_kg`, timestamp. `slug` tetap kebab-case agar URL stabil lintas bahasa.

---

## 4. Tugas per teritori

### AGENT-AI (seed) — `data/seed/products.json` + `data/`
1. Perbarui **kontrak & isi** `products.json`: setiap field pada tabel Bagian 3 jadi dwibahasa sesuai bentuk yang dikunci Satria.
2. Generate teks EN+ID dengan Gemini (natif, bukan terjemah harfiah). Patuhi aturan nama merek (Bagian 1).
3. 6 kategori final sediakan label ID+EN:
   `living-room` = Living room / Ruang keluarga · `bedroom` = Bedroom / Kamar tidur · `workspace` = Workspace / Ruang kerja · `dining-room` = Dining room / Ruang makan · `storage` = Storage / Penyimpanan · `lighting` = Lighting / Pencahayaan.
4. **Alternatif backfill** (bila tak mau regenerate 60 item dari nol): jalankan **sekali** workflow n8n atau skrip yang memanggil Gemini untuk mengisi bahasa kedua dari data existing, lalu simpan. Tetap masuk pola "translate sekali, simpan".

### AGENT-BE (skema + endpoint) — `services/api/` + `supabase/migrations/`
1. **Migrasi** (`NNN_...sql`, nomor `max+1`, `git pull` dulu): tambah kolom bahasa kedua (atau JSONB) di `categories`, `products`, `product_variants`, `product_images` sesuai bentuk terkunci. **Tanpa `AutoMigrate`** (larangan global).
2. **Seed loader**: baca field dwibahasa dari `products.json` → isi kolom.
3. **Endpoint — implement "Server memilih locale":** baca `?lang=en|id` **atau** header `Accept-Language` (default `id`), pilih kolom bahasa yang sesuai, **kembalikan flat string** (bentuk respons TIDAK berubah). Endpoint terdampak:
   `GET /categories` · `GET /products` · `GET /products/{slug}` · `GET /orders` · `GET /orders/{id}`.

### AGENT-QA
- Validasi tiap endpoint dengan `lang=en` dan `lang=id` (dan via header `Accept-Language`): field pada tabel Bagian 3 berganti bahasa; field netral tidak berubah; bentuk envelope tetap sesuai kontrak.

---

## 5. Status FE — SUDAH SIAP (tidak ada pekerjaan tersisa untuk Opsi A)

Perbaikan FE (sesi 2026-07-12) sudah menyiapkan sisi klien:
- Fetcher `lib/api.ts` mengirim `Accept-Language` dari cookie `kriya-locale`.
- `lib/queries.ts`: `queryKey` menyertakan `locale` → ganti bahasa memicu **refetch** dengan `Accept-Language` baru (bukan menyajikan cache lama).
- Label statis PDP (judul tab, label dimensi, "Material", paragraf panduan) dipindah ke kamus i18n `t()`.
- Nama kategori (header/showcase/footer/breadcrumb/PDP) locale-aware via `lib/category-meta.ts` (map lokal sebagai fallback bila API belum mengirim `name` per-lang).

Begitu BE mengembalikan field per-`lang`, FE **otomatis** menampilkan bahasa yang benar tanpa perubahan tambahan.

---

## 6. Urutan eksekusi

1. **Satria** kunci bentuk seed (Bagian 2a) + skema (Bagian 2b) → update kontrak Bagian 6 (seed) & Bagian 7 (skema) di KRIYA-MASTER.
2. **AGENT-AI** regenerate/backfill `products.json` dwibahasa.
3. **AGENT-BE** migrasi + seed loader + endpoint locale.
4. **AGENT-QA** validasi `lang=en|id` per endpoint.
5. **AGENT-FE** verifikasi toggle EN/ID di browser (harus sudah jalan tanpa perubahan kode).

---

## 7. Gap kontrak yang harus Satria tutup lebih dulu

Kontrak file seed di Bagian 6 (`data/seed/products.json`) saat ini hanya menampilkan **satu** `name`/`description` per produk. Inilah titik yang perlu diubah agar "Server memilih locale" punya sumber data dwibahasa. Skema Bagian 7 juga belum punya kolom bahasa kedua. Keduanya milik Satria untuk diputuskan sebelum AI/BE menulis kode.
