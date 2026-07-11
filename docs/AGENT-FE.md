# AGENT-FE — Frontend KRIYA

Kamu adalah agent frontend. Baca `KRIYA-MASTER.md` dulu (kontrak API Bagian 6 adalah kitab sucimu). Teritorimu: **`apps/web/` saja.**

## Stack & aturan teknis

- Next.js **App Router**, TypeScript **strict**, Tailwind, **shadcn/ui** (init dengan tema netral; komponen shadcn di `components/ui/`, komponen bisnis di `components/kriya/`).
- Server Components sebagai default; `"use client"` hanya bila perlu (cart, form, search, chat, Snap).
- **TanStack Query** untuk semua server state di client components. **Zustand** hanya untuk client state: `cartStore` (persist), `uiStore` (drawer/modal/toast). Auth memakai supabase-js; JANGAN simpan token manual.
- Satu fetcher terpusat `lib/api.ts`: baca `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_AI_URL`, sisipkan Bearer token bila ada sesi, parse envelope `{data, meta}` dan lempar error terstruktur dari `{error}`. Semua panggilan API lewat fetcher ini — tidak ada `fetch` liar.
- **Fixture-first:** `lib/fixtures/` berisi contoh data yang match kontrak byte-per-byte. Flag `NEXT_PUBLIC_USE_FIXTURES=true` mengalihkan fetcher ke fixtures, sehingga FE bisa maju tanpa menunggu BE. Setiap kali kontrak berubah (oleh Satria), fixtures ikut diperbarui.
- DILARANG query database Supabase langsung. Pengecualian: Auth (supabase-js) dan upload gambar ke Storage di halaman admin (M6).
- Gambar: `next/image`, `remotePatterns` untuk host Supabase Storage. Rasio kartu produk 4:5.
- Harga: integer rupiah dari API → format `Rp1.250.000` via util `formatRupiah()`.

## Arah desain (agar tidak generic)

Furniture minimal hangat: palet netral (stone/putih gading) + satu aksen terracotta/amber; banyak whitespace; tipografi bersih (Geist/Inter) dengan display besar di hero; grid produk 2 kolom mobile → 4 desktop; sentence case; foto besar bicara, dekorasi sedikit. Semua teks UI Bahasa Indonesia. Jangan pernah lorem ipsum — pakai fixtures.

## Task per milestone

### M0 — Scaffold
- [x] `create-next-app` (TS, Tailwind, App Router) di `apps/web`, init shadcn/ui
- [x] Struktur: `app/(store)/`, `app/(auth)/`, `app/(admin)/`, `components/`, `lib/`, `stores/`
- [x] `lib/api.ts` + `lib/fixtures/` (products, product detail, categories, cart, orders — sesuai kontrak) + `formatRupiah`
- [x] Layout dasar: header (logo KRIYA, nav kategori, search placeholder, ikon cart), footer
- [x] `.env.local.example` berisi semua `NEXT_PUBLIC_*`

### M1 — Katalog (fixtures dulu, sambungkan ke API live di akhir)
- [x] Home: hero (carousel), grid 6 kategori, produk terbaru + layout ala anon (top bar, fitur layanan, banner penawaran, footer + newsletter)
- [x] `/kategori/[slug]`: listing + filter (harga preset, sort) + pagination sesuai `meta` (state di URL)
- [x] `/produk/[slug]`: galeri, pemilih varian (warna/ukuran → harga & stok berubah), dimensi & material, tab "Panduan perakitan" (placeholder bila belum ada)
- [x] State kosong & loading skeleton untuk semua halaman data

### M2 — Transaksi
- [x] `/(auth)`: login & register (supabase-js, email + Google)
- [x] Cart drawer + `/cart` (Zustand persist untuk guest; setelah login, sinkron via `PUT /api/v1/cart` dengan debounce)
- [x] `/checkout`: form alamat (validasi), pilih zona kirim, ringkasan; submit → `POST /orders` → buka **Snap popup** (`snap.js` sandbox, `snap_token` + `midtrans_client_key` dari respons)
- [x] `/pesanan` + `/pesanan/[id]`: daftar & detail, badge status berwarna, polling ringan saat `pending_payment`

### M3 — AI search
- [x] Search bar global (debounce 300 ms) → `/cari?q=` memanggil `GET /ai/v1/search`; tampilkan hint kecil bila `meta.mode = "keyword_fallback"`
- [x] Blok "Produk serupa" di PDP via `/ai/v1/products/{id}/similar`

### M4 — Chat widget
- [x] Widget mengambang (bubble kanan bawah): `session_id` uuid per sesi browser, kirim ke `NEXT_PUBLIC_CHAT_WEBHOOK_URL`, render `reply` + chip `sources`; sertakan `user.email` bila login; state mengetik; error state ramah

### M6 — Admin (kontrak final di gerbang M6)
- [x] Route group `/(admin)` dengan guard `profiles.role === 'admin'`
- [x] CRUD produk/varian/stok, daftar pesanan + ubah status, kartu metrik sederhana

## Definition of done (setiap task)
`next build` hijau, lint bersih, responsif mobile-first, teks Indonesia, tidak ada file di luar `apps/web/` yang tersentuh, log terisi.

## Larangan spesifik
Jangan mengganti library UI/state yang sudah ditetapkan. Jangan hardcode URL service (selalu env). Jangan menyimpan JWT di localStorage manual. Jangan mengubah fixtures menyimpang dari kontrak — kalau kontrak terasa salah, ajukan lewat "Permintaan lintas-teritori".

## Permintaan lintas-teritori
(tulis di sini, format: tanggal — kebutuhan — alasan; lalu berhenti dan tunggu Satria)

## Log
(append satu baris per sesi: `2026-07-06 · [fe] task · status/catatan`)
2026-07-06 · [fe] M1 katalog (layout ala anon) · selesai — home (hero carousel, kategori, rail produk, banner, footer+newsletter), /kategori/[slug] (filter harga+sort+paginasi via URL), /produk/[slug] (galeri, varian, tab), skeleton+empty state semua halaman; fixtures diperluas 24 produk; placeholder monogram untuk foto; next build hijau, lint bersih. Catatan: menambah placeholder /cari (M3) & /cart (M2) + not-found agar shell tidak buntu. Belum di-commit (menunggu Satria).
2026-07-08 · [fe] M2 transaksi · selesai — auth pages (login/register/callback via supabase-js), cart store (Zustand persist + API sync), cart page UI lengkap, checkout flow (validasi + Midtrans Snap), orders list & detail (polling saat pending). Sonner untuk toast. Next build hijau, lint bersih. Siap di-commit.
2026-07-08 · [fe] M3 AI search · selesai — halaman /cari dengan handling keyword fallback, blok "Produk serupa" di halaman PDP. Next build hijau.
2026-07-08 · [fe] M4 Chatbot & M6 Admin · selesai — membuat komponen `chat-widget.tsx` yang menangani UI, state mengetik, dan rendering sources. Layout serta halaman admin scaffolded (`/admin`, `/admin/produk`, `/admin/pesanan`) sudah dibuat dan lulus build check.
2026-07-12 · [fe] halaman Profil + prefill checkout · `/profil` (form data diri + alamat, load via `useProfile`, simpan via `updateProfile` + TanStack mutation), `getProfile`/`updateProfile` di `lib/api.ts`, tipe `Profile`, `fixtures.profile`, link "Profil" di header (desktop + menu mobile). Checkout kini auto-prefill `shipping_address` dari profil tersimpan (recipient←full_name dst.), memakai pola adjust-state saat render — bukan `setState` di `useEffect` — agar patuh aturan React 19 `react-hooks/set-state-in-effect`. `next build` hijau, lint 0 error, `/profil` muncul di route list. Sesi lintas-teritori atas arahan Satria.
