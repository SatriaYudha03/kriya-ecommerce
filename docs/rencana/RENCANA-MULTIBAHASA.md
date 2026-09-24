# Rencana: Rename slug EN + Fitur Multi-bahasa (EN/ID) KRIYA

> Dokumen rencana (handoff). Disusun untuk dikerjakan oleh agent/sesi berikutnya.
> Belum dieksekusi. Ikuti teritori & ritual sesi di `docs/agents/KRIYA-MASTER.md`.

## Context

Pemilik (Satria) ingin: (1) mengubah "nama endpoint" dan "tag HTML" berbahasa
Indonesia menjadi Inggris, dan (2) menambah fitur ganti bahasa (Inggris/Indonesia)
di mana **semua** teks bisa diganti — termasuk data dari database.

Temuan eksplorasi mengoreksi premis awal:

- **API backend sudah 100% Inggris.** Path (`/api/v1/products`, `/categories`,
  `/orders`, ...), nama handler, tabel & kolom DB, dan JSON tag (`snake_case`)
  semuanya Inggris. Tidak ada yang perlu di-rename di API/DB.
- Yang berbahasa Indonesia sebenarnya:
  1. **Slug rute frontend** (URL di browser): `/produk`, `/kategori`, `/cari`,
     `/pesanan`, `/profil`, `/admin/produk`, `/admin/pesanan`.
  2. **Teks UI hardcoded** (~4.500 baris TSX): heading, tombol, label,
     `placeholder`, `aria-label`, ~24 `toast.*`, dan string error di `lib/api.ts`.
  3. **Konten DB** (nama/deskripsi produk, kategori, material, panduan rakit, KB AI)
     — satu nilai teks per field, tanpa dimensi locale.
- **Belum ada infrastruktur i18n apa pun.**
- Catatan penting: konten katalog/KB yang tersimpan saat ini justru **Inggris**
  (deviasi yang sudah disetujui Satria), sedangkan UI chrome Indonesia — jadi app
  sekarang sudah campur bahasa.

### Keputusan pemilik (sudah dikonfirmasi)
- **Slug URL FE:** rename ke Inggris (tanpa redirect lama).
- **Konten DB:** kolom per-locale JSONB `{en, id}`, di-terjemahkan lebih dulu
  (pre-translated), disimpan dua bahasa.
- **i18n UI statis:** ringan — Zustand + kamus (dictionary), meniru pola
  `cart-store` yang sudah ada. Tanpa library berat, URL tetap bersih.

### Prinsip kontrak yang WAJIB dijaga
- **Bentuk respons API tidak berubah** (Bagian 10 master: "Jangan mengubah bentuk
  respons dari kontrak"). Field `name`/`description` tetap `string`. Lokalisasi
  dilakukan di sisi server berdasar parameter `lang`/`Accept-Language`, bukan
  dengan mengubah tipe response.
- Perubahan kontrak (menambah param `lang`) & konvensi Bagian 5 ("Seluruh teks UI
  Bahasa Indonesia") diedit **lebih dulu** di dokumen milik Satria, baru kode
  (Bagian 8). Sesi ini adalah **sesi lintas-teritori yang diawasi Satria**.

---

## Scope & fase (satu task per sesi, per teritori)

Ini perubahan besar lintas-teritori (FE, BE, AI/data, migrations, docs Satria).
Dipecah jadi fase; tiap fase = satu sesi sesuai ritual (`git pull` → 1 task →
build hijau → commit `[fe|be|ai] ...` → push → isi Log agent).

- **Fase 0 — Docs/kontrak (Satria):** simpan plan ke `docs/`, update kontrak Bagian 6
  (+param `lang`) & konvensi Bagian 5 (izinkan EN/ID) di `docs/agents/KRIYA-MASTER.md`,
  sesuaikan DoD `docs/agents/AGENT-FE.md`.
- **Fase 1 — FE rename slug** ke Inggris.
- **Fase 2 — FE i18n** (infra kamus + switcher + terjemah teks statis).
- **Fase 3 — BE + migrasi** (kolom per-locale + baca sadar-locale + param `lang`).
- **Fase 4 — data/AI seed** (konten seed bilingual + re-seed).
- **Fase 5 — AI KB/chatbot (opsional, dalam M4):** KB `documents.content` bilingual
  + keputusan re-ingest embedding (768-dim). Ditunda; butuh keputusan Satria.

---

## Fase 0 — Docs & kontrak (teritori Satria)

1. **Simpan plan ini** ke `docs/rencana/RENCANA-MULTIBAHASA.md` (langkah pertama setelah approve).
2. `docs/agents/KRIYA-MASTER.md`:
   - **Bagian 6:** tambahkan param opsional `lang` (`en`|`id`, default `id`) pada
     endpoint katalog & order yang mengembalikan teks konten
     (`GET /categories`, `GET /products`, `GET /products/{slug}`,
     `GET /orders`, `GET /orders/{id}`). Catat: bentuk respons tetap
     (`name` = string), server memilih locale. Boleh juga via header
     `Accept-Language`.
   - **Bagian 5 (Konvensi global):** ubah "Seluruh teks UI Bahasa Indonesia" →
     UI mendukung dua bahasa EN/ID; default `id`.
   - Formalkan sekalian endpoint `/profile` & admin M6 yang belum masuk kontrak
     (opsional, sudah jadi utang kontrak sebelumnya).
3. `docs/agents/AGENT-FE.md`: sesuaikan Definition of Done ("teks Indonesia" → "teks
   EN/ID via kamus i18n").

---

## Fase 1 — Rename slug rute FE ke Inggris (teritori `apps/web/`)

**Rename direktori rute** di `apps/web/app/`:

| Lama | Baru |
|---|---|
| `(store)/produk/[slug]` | `(store)/products/[slug]` |
| `(store)/kategori/[slug]` | `(store)/categories/[slug]` |
| `(store)/cari` | `(store)/search` |
| `(store)/pesanan` , `(store)/pesanan/[id]` | `(store)/orders` , `(store)/orders/[id]` |
| `(store)/profil` | `(store)/profile` |
| `(admin)/admin/produk` | `(admin)/admin/products` |
| `(admin)/admin/pesanan` | `(admin)/admin/orders` |

- Update **semua** referensi internal: `<Link href="...">`, `router.push`,
  `redirect`, `usePathname`/active-nav checks. Cari dengan grep untuk tiap slug
  lama (`/produk`, `/kategori`, `/cari`, `/pesanan`, `/profil`, `/admin/produk`,
  `/admin/pesanan`) di seluruh `apps/web`.
- Titik yang sudah diketahui: `components/kriya/site-header.tsx` (nav & drawer),
  `app/(store)/layout.tsx`, `app/(admin)/layout.tsx`, kartu produk/kategori, hero
  CTA, halaman checkout/order.
- **API tidak disentuh** (path API sudah Inggris). Ini murni rename URL FE.
- Verifikasi: `next build` hijau + klik semua rute baru; tidak ada 404 / link mati.

---

## Fase 2 — i18n UI statis + language switcher (teritori `apps/web/`)

### Infrastruktur (baru, ringan, tanpa library)
- `apps/web/lib/i18n/messages/en.ts` & `id.ts` — kamus key→string (typed).
  Kunci deskriptif per area (mis. `header.orders`, `checkout.payNow`,
  `toast.paymentSuccess`).
- `apps/web/lib/i18n/index.ts` — `type Locale = "en" | "id"`, `t(locale, key, params?)`
  dengan fallback ke `id`, plus tipe union key untuk keamanan TS strict.
- **Sumber kebenaran locale = cookie** (`kriya-locale`) agar SSR & `<html lang>`
  benar tanpa flash:
  - `apps/web/components/kriya/language-provider.tsx` — Context client, di-seed dari
    nilai cookie yang dibaca di Server Component `app/layout.tsx`, expose
    `{ locale, setLocale, t }`. `setLocale` menulis cookie lalu `router.refresh()`
    supaya Server Component (termasuk `<html lang>`) & data re-render.
  - Pasang provider di `apps/web/app/providers.tsx` (bungkus di dalam `AuthProvider`).
  - `hook useT()` / `useLocale()` untuk komponen client.
- `app/layout.tsx`: baca cookie → `<html lang={locale}>` dinamis; `metadata`
  title/description dibuat per-locale (via `generateMetadata`).

> Catatan: pola `cart-store` (Zustand persist) tetap referensi, tapi untuk locale
> dipakai **cookie** (bukan localStorage) agar server tahu bahasa saat render awal
> dan tidak ada mismatch hidrasi. Ini tetap "ringan, tanpa library i18n".

### UI switcher
- Tambah toggle EN/ID di cluster aksi kanan `components/kriya/site-header.tsx`
  (sekitar baris 62–120) dan entri padanan di drawer mobile (baris 148–217).
- Pertimbangkan juga slot `components/kriya/top-bar.tsx`.
- `(auth)` & `(admin)` punya layout sendiri — pastikan switcher/provider ikut jika
  ingin tampil di sana.

### Terjemahkan teks statis (~35 file)
- Ganti string hardcoded → `t("...")` di: `site-header`, `top-bar`, `hero`,
  `service-features`, `checkout/page`, `product-detail-view`, `profile/page`,
  `chat-widget`, `admin/product-form`, dll. Cakup juga `placeholder`, `aria-label`,
  array data (hero slides, service-features), label tombol, dan **24 `toast.*`**.
- String error klien di `lib/api.ts` (mis. "Terjadi kesalahan tak terduga",
  "Produk tidak ditemukan", "Pesanan tidak ditemukan") → kunci kamus.
- Format tanggal `toLocaleDateString("id-ID")` (`orders/page`, `orders/[id]`,
  `admin/orders`) → pakai `locale` aktif. Rupiah tetap `id-ID` (mata uang IDR).
- Verifikasi: toggle bahasa mengubah seluruh teks; `tsc` strict & `next build` hijau.

---

## Fase 3 — Konten DB bilingual (teritori `services/api/` + migrasi SHARED)

### Migrasi (`supabase/migrations/007_i18n_content.sql`)
Tambah kolom JSONB per-locale (bentuk `{"en": "...", "id": "..."}`) di kolom konten:
- `categories.name_i18n`
- `products.name_i18n`, `products.description_i18n`, `products.materials_i18n`
- `product_variants.color_i18n`, `product_variants.size_i18n`
- `product_images.alt_i18n`
- `assembly_guides.content_md_i18n`

Isi awal: backfill `{"en": <nilai lama>, "id": <nilai lama>}` agar tidak ada NULL,
lalu terjemahan `id` diisi di Fase 4. Kolom teks lama dipertahankan sebagai
fallback (jangan drop dulu). Nomor migrasi = `max+1` (`git pull` dulu).
`order_items.name/color/size` = **snapshot** saat order → dibiarkan (locale saat beli).

### Backend (Gin) — baca sadar-locale, bentuk respons TETAP
- Resolusi locale per request: param `?lang=` (utama) atau header `Accept-Language`,
  default `id`. Helper kecil `resolveLocale(c)` (mis. di `internal/middleware` atau
  util handler).
- Di repository/handler katalog & order (`internal/repository/catalog.go`,
  `order.go`; `internal/handler/catalog.go`, `order.go`): saat mapping ke DTO,
  pilih `name = name_i18n[locale]` dengan fallback `id`→`en`→kolom lama. Response
  DTO `internal/model/response.go` **tidak berubah** (`name` tetap `string`).
- Rapikan sekalian **~40 string error Indonesia hardcoded** di
  `handler/{order,cart,admin,profile,payment}.go` (dan inkonsistensi `catalog.go`
  yang malah Inggris) → satu message catalog kecil sadar-locale (opsional tapi
  disarankan; `Message` juga mengikuti `lang`).

### Frontend
- `lib/api.ts` / `lib/queries.ts`: sertakan `lang` (dari locale aktif) pada request
  katalog & order, sehingga nama/deskripsi produk ikut ganti bahasa.
- `lib/category-meta.ts` (`categoryLabels`) sudah override nama kategori per-slug →
  jadikan per-locale (map `{en, id}`), atau andalkan `name` dari API yang kini
  sudah terlokalisasi.
- Verifikasi: `go build`/test hijau; `GET /api/v1/products?lang=id` vs `?lang=en`
  mengembalikan `name`/`description` beda, bentuk JSON sama; fallback saat kosong.

---

## Fase 4 — Seed konten bilingual (teritori `data/` — AGENT-AI)

- `data/seed/products.json` (kini Inggris) → tambah terjemahan Indonesia untuk
  `name`, `description`, `materials`, kategori, `alt`, `content_md` panduan rakit.
- Sesuaikan `services/api/cmd/seed/main.go` agar menulis kolom `*_i18n`.
- Re-seed DB. Verifikasi katalog tampil benar di kedua bahasa.

---

## Fase 5 — KB AI & chatbot bilingual (opsional, dalam M4 — DITUNDA)

- `documents.content` (pgvector 768-dim) + chatbot: menambah konten Indonesia
  berarti **re-ingest embedding** (mahal; "ubah = ingest ulang semua", hanya Satria
  yang memutuskan). Chatbot M4 sendiri belum selesai.
- Rekomendasi: tangani bersama pekerjaan M4 di sesi AGENT-AI terpisah, dengan
  keputusan re-ingest eksplisit dari Satria. **Di luar cakupan Fase 1–4.**

---

## Verifikasi end-to-end (per fase & gabungan)

- **FE (Fase 1–2):** `pnpm --dir apps/web dev`; buka rute baru Inggris (tidak ada
  404), toggle EN/ID mengubah semua teks statis + `aria-label` + toast; `<html lang>`
  ikut berubah; tidak ada error hidrasi/console; `next build` + `tsc` strict hijau.
- **BE (Fase 3):** `go build ./... && go test ./...` di `services/api`; uji
  `/api/v1/products?lang=en` vs `?lang=id` (dan `Accept-Language`) — `name`/
  `description` terlokalisasi, bentuk respons identik; cek fallback locale kosong.
  Migrasi 007 ter-apply (cek kolom `*_i18n` + backfill non-NULL).
- **Gabungan:** dari UI, ganti bahasa → teks statis DAN nama/deskripsi produk dari
  DB berganti bersamaan; pesanan & checkout konsisten.
- Tiap sesi: isi satu baris `## Log` di `AGENT-*.md` sesuai ritual; commit
  `[fe|be|ai] ...`.

---

## Risiko & catatan
- **Volume terjemahan besar** (~137 string statis + konten katalog). Terbanyak:
  `admin/product-form.tsx`, `checkout/page.tsx`, `product-detail-view.tsx`,
  `profile/page.tsx`, `site-header.tsx`, `chat-widget.tsx`.
- **Next.js 16** punya breaking changes vs pengetahuan lama — cek
  `apps/web/node_modules/next/dist/docs/` sebelum menulis kode i18n/metadata.
- **Jangan `AutoMigrate`**, jangan drop kolom lama sebelum backfill terverifikasi,
  jangan ubah tabel milik agent lain, jangan commit `.env`/secret.
- Kontrak M1–M4 "DIKUNCI" — penambahan param `lang` harus lewat edit dokumen Satria
  dulu (Fase 0), baru kode (Fase 3).
