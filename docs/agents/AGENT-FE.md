# AGENT-FE — Frontend KRIYA

Kamu adalah agent frontend. Baca `docs/agents/KRIYA-MASTER.md` dulu (kontrak API Bagian 6 adalah kitab sucimu). Teritorimu: **`apps/web/` saja.**

## Stack & aturan teknis

- Next.js **App Router**, TypeScript **strict**, Tailwind, **shadcn/ui** (init dengan tema netral; komponen shadcn di `components/ui/`, komponen bisnis di `components/kriya/`).
- Server Components sebagai default; `"use client"` hanya bila perlu (cart, form, search, chat, Snap).
- **TanStack Query** untuk semua server state di client components. **Zustand** hanya untuk client state: `cartStore` (persist), `uiStore` (drawer/modal/toast). Auth memakai supabase-js; JANGAN simpan token manual.
- **Infrastruktur HTTP & Modularitas Domain v2:**
  - Core HTTP: `lib/http.ts` menyediakan helper `request()`, `ApiError`, `setAccessTokenGetter()`, dan flag `USE_FIXTURES`.
  - Modul Domain FE di `apps/web/lib/<domain>/`:
    - `lib/catalog/{api,types,queries,fixtures}.ts`: Katalog publik & admin, facet filter, varian, sale pricing, inventori.
    - `lib/customer/{api,types,queries,fixtures}.ts`: Profil, buku alamat, keranjang relasional (`cart-store.ts`), wishlist, opsi ongkir tabel, pengaturan toko.
    - `lib/promo/{api,types,queries,fixtures}.ts`: Kupon publik & admin, validasi kupon checkout, laporan (summary/sales/top-products), dashboard stats.
    - `lib/aftersales/{api,types,queries,fixtures}.ts`: Riwayat & pembatalan pesanan, order timeline/notes, ulasan produk, retur barang, notifikasi in-app.
    - `lib/checkout/{api,types,queries,fixtures}.ts`: Checkout quote engine, pembuatan order v2, integrasi popup Snap.
  - Barrel kompatibilitas: `lib/{api,types,queries,admin-queries}.ts` me-re-export antarmuka modular di atas untuk menjaga kestabilan shell layout.
- **Komponen Domain Terkait di `components/kriya/<domain>/`:**
  - `catalog/`: `ProductCard`, `ProductDetailView`, `VariantSelector`, `FilterBar`, `CategoryCard`, `CategoryShowcase`.
  - `customer/`: `AddressPicker`, `AddressCard`, `AddressFormDialog`, `ShippingMethodPicker`, `WishlistButton`.
  - `promo/`: `CouponInput`, `PromoBanner`, `ReportsView`.
  - `aftersales/`: `OrderStatusBadge`, `CancelOrderDialog`, `ReturnDialog`, `ProductReviews`, `ReviewFormDialog`, `NotificationBell`.
- DILARANG query database Supabase langsung. Pengecualian: Auth (supabase-js) dan upload gambar ke Storage di halaman admin (M6).
- Gambar: `next/image`, `remotePatterns` untuk host Supabase Storage. Rasio kartu produk 4:5.
- Harga: integer rupiah dari API → format `Rp1.250.000` via util `formatRupiah()`.
- **`any` DILARANG** (master Bagian 5). `next lint` menegakkannya lewat `@typescript-eslint/no-explicit-any` dan gagal di CI job **Lint** — bukan di `tsc`, jadi `tsc` hijau **tidak** berarti aman. Pengganti: tipe konkret di `lib/types.ts`, `unknown` + penyempitan untuk `catch`, generic, atau union literal.
  - Kesalahan yang paling sering muncul di teritori ini: `t("some.key" as any)`. Key i18n bertipe `MessageKey = keyof Dictionary` — kalau TS menolak key-mu, **key-nya belum ada di `lib/i18n/messages/id.ts` + `en.ts`**. Tambahkan key di kedua kamus; jangan pernah bungkam dengan cast. Cast semacam ini pernah menumpuk sampai 85 buah dan memerahkan CI (lihat Log 2026-08-01).
  - Error di `catch` bertipe `unknown`: pakai `error instanceof Error ? error.message : "<pesan fallback>"` atau `ApiError` dari `lib/api.ts`.

## Arah desain (agar tidak generic)

Furniture minimal hangat: palet netral (stone/putih gading) + satu aksen terracotta/amber; banyak whitespace; tipografi bersih (Geist/Inter) dengan display besar di hero; grid produk 2 kolom mobile → 4 desktop; sentence case; foto besar bicara, dekorasi sedikit. UI mendukung dua bahasa EN/ID via kamus i18n; default `id`. Jangan pernah lorem ipsum — pakai fixtures.

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
`next build` hijau, **`npx tsc --noEmit` 0 error DAN `npx eslint .` 0 problem** (0 error *dan* 0 warning — keduanya wajib dicek, `tsc` saja tidak cukup), responsif mobile-first, teks EN/ID via kamus i18n, tidak ada file di luar `apps/web/` yang tersentuh, log terisi.

## Larangan spesifik
Jangan mengganti library UI/state yang sudah ditetapkan. Jangan hardcode URL service (selalu env). Jangan menyimpan JWT di localStorage manual. Jangan mengubah fixtures menyimpang dari kontrak — kalau kontrak terasa salah, ajukan lewat "Permintaan lintas-teritori". Jangan memakai `any`/`as any` (master Bagian 5), dan jangan menutup temuan lint dengan `eslint-disable`, `@ts-ignore`, atau `@ts-expect-error` — perbaiki tipenya, atau ajukan lewat "Permintaan lintas-teritori". Jangan menutup sesi dengan meninggalkan error/warning lint "bawaan dari sebelumnya": kalau jumlahnya bertambah karena kodemu, itu tanggung jawabmu.

## Permintaan lintas-teritori
(tulis di sini, format: tanggal — kebutuhan — alasan; lalu berhenti dan tunggu Satria)
2026-07-12 — i18n konten produk (Opsi A: seed dwibahasa + simpan) — deskripsi/material/nama produk hanya bisa ikut bahasa jika DISIMPAN dwibahasa & server memilih locale (kontrak Bagian 6 sudah mengasumsikan ini, tapi seed Bagian 6 & skema Bagian 7 masih satu bahasa). Butuh: (1) Satria kunci bentuk seed + skema dwibahasa & update kontrak; (2) AGENT-AI seed dwibahasa via Gemini; (3) AGENT-BE migrasi kolom bahasa kedua + endpoint pilih-locale. Rencana lengkap: `docs/rencana/RENCANA-I18N-KONTEN-PRODUK.md`. Sisi FE sudah siap (Accept-Language, refetch per-locale, label statis via kamus). Berhenti, menunggu keputusan Satria.
2026-09-29 — BE: tambah `Access-Control-Max-Age` di CORS (`services/api/internal/middleware`) — setelah Fase 3 RENCANA-PERFORMA-LATENSI, GET publik tak lagi preflight, tapi request ber-`Authorization` masih preflight tiap kali (+1 round-trip ke API). Opsional, bukan blocker; FE tidak menunggu.

## Log
(append satu baris per sesi: `2026-07-06 · [fe] task · status/catatan`)
2026-07-06 · [fe] M1 katalog (layout ala anon) · selesai — home (hero carousel, kategori, rail produk, banner, footer+newsletter), /kategori/[slug] (filter harga+sort+paginasi via URL), /produk/[slug] (galeri, varian, tab), skeleton+empty state semua halaman; fixtures diperluas 24 produk; placeholder monogram untuk foto; next build hijau, lint bersih. Catatan: menambah placeholder /cari (M3) & /cart (M2) + not-found agar shell tidak buntu. Belum di-commit (menunggu Satria).
2026-07-08 · [fe] M2 transaksi · selesai — auth pages (login/register/callback via supabase-js), cart store (Zustand persist + API sync), cart page UI lengkap, checkout flow (validasi + Midtrans Snap), orders list & detail (polling saat pending). Sonner untuk toast. Next build hijau, lint bersih. Siap di-commit.
2026-07-08 · [fe] M3 AI search · selesai — halaman /cari dengan handling keyword fallback, blok "Produk serupa" di halaman PDP. Next build hijau.
2026-07-08 · [fe] M4 Chatbot & M6 Admin · selesai — membuat komponen `chat-widget.tsx` yang menangani UI, state mengetik, dan rendering sources. Layout serta halaman admin scaffolded (`/admin`, `/admin/produk`, `/admin/pesanan`) sudah dibuat dan lulus build check.
2026-07-12 · [fe] halaman Profil + prefill checkout · `/profil` (form data diri + alamat, load via `useProfile`, simpan via `updateProfile` + TanStack mutation), `getProfile`/`updateProfile` di `lib/api.ts`, tipe `Profile`, `fixtures.profile`, link "Profil" di header (desktop + menu mobile). Checkout kini auto-prefill `shipping_address` dari profil tersimpan (recipient←full_name dst.), memakai pola adjust-state saat render — bukan `setState` di `useEffect` — agar patuh aturan React 19 `react-hooks/set-state-in-effect`. `next build` hijau, lint 0 error, `/profil` muncul di route list. Sesi lintas-teritori atas arahan Satria.
2026-07-12 · [fe] M6 panel admin (selesai penuh) · `AdminGuard` (probe `GET /admin/stats`; belum login → `/login?next=/admin`, ditolak/403 → toast + redirect `/`), dashboard metrik, `/admin/pesanan` (list + ubah status), `/admin/produk` (list + form create/edit dengan varian dinamis + upload gambar langsung ke Supabase Storage bucket `products` via `lib/storage.ts`, toggle primer, hapus gambar). Hook baru `lib/admin-queries.ts` (TanStack Query + toast sonner). `next build` hijau, seluruh rute admin ter-generate statis. Diverifikasi login admin asli di browser: guard → dashboard tampil benar. Sesi lintas-teritori atas arahan Satria.
2026-07-12 � [fe] Fase 1 & 2 Rencana Multi-bahasa � selesai � rename seluruh slug rute FE ke bahasa Inggris (/products, /categories, /search, /orders, /profile, dll), update semua <Link> & path router, buat infra i18n lokal ringan (cookie, dict) dan switcher EN/ID di header. Next build hijau.
2026-07-12 · [fe] i18n lanjutan (kategori + PDP) · nama kategori (header/showcase/footer/breadcrumb/PDP) kini ikut locale via `categoryLabel(slug,name,locale)` + map EN/ID di `category-meta.ts`; label statis PDP (tab, dimensi, material, panduan) dipindah ke kamus i18n (11 key baru id/en); query konten (`useProduct/useProducts/useSearch/useSimilarProducts/useOrders/useOrder/useCategories`) diberi `locale` di queryKey agar ganti bahasa memicu refetch `Accept-Language`. `next build` hijau, TS lulus, lint tetap 87 err (0 tambahan). Deskripsi/material asli tetap butuh backend melokalkan → diangkat sebagai Permintaan lintas-teritori (Opsi A, `docs/rencana/RENCANA-I18N-KONTEN-PRODUK.md`). Sesi lintas-teritori atas arahan Satria.
2026-08-01 · [fe] bersihkan lint CI sampai nol · CI job **Lint** merah dengan 92 problem (87 error, 5 warning) — bukan error `tsc` (`tsc --noEmit` 0 error sebelum maupun sesudah), melainkan ESLint dari preset `eslint-config-next/typescript`. Rincian: 85 `@typescript-eslint/no-explicit-any` + 2 `react-hooks` + 5 `no-unused-vars`. Ke-85 error `any` seluruhnya berpola `t("key" as any)` di 15 file; diverifikasi bahwa 80 key unik yang di-cast **sudah terdaftar** di `messages/id.ts` — jadi cast-nya mubazir (sisa dari commit i18n yang key-nya belum lengkap saat itu) dan dihapus tanpa perlu menambah tipe apa pun. `react-hooks/set-state-in-effect` di `admin/product-form.tsx`: prefill 12 state dari `useEffect` diganti pola adjust-state saat render dengan guard `seeded`, konsisten dengan `/checkout` & `/profile` — sekaligus mencegah refetch (window focus) menimpa suntingan yang belum disimpan. `react-hooks/immutability`: mutasi `r.id = created.id` pada objek state `images` diganti array lokal `persisted`, urutan & semantik primary/alt dipertahankan. Warning: hapus import mati (`ProductRail`/`PromoBanner` di home — sudah dipakai `ClientProductRails`; `X` di chat-widget; `useEffect` di language-provider) dan `catch (err)` → `catch`. Hasil akhir: **`eslint .` 0 problem, `tsc --noEmit` 0 error, `next build` hijau (16 rute)**. Catatan: build sempat tertahan lock stale `.next/turbopack` (0 byte, sisa proses lint sebelumnya, `.next/` gitignored) — dihapus. Atas arahan Satria, aturan larangan `any` juga ditambahkan ke `CLAUDE.md`, master Bagian 5 & 10, dan kelima file agent. Sesi lintas-teritori atas arahan Satria.
2026-09-27 · [fe] task F3-Z · Sinkronisasi dokumentasi modular FE domain lib/<domain> dan komponen domain kriya/<domain> selesai.
2026-09-29 · [fe] Fase 3 RENCANA-PERFORMA-LATENSI (fetch ganda + cache katalog) · `lib/catalog/server.ts` baru (locale cookie + React cache + revalidate 300/60 s); detail produk fetch sekali di server → `initialData` (tanpa refetch client, tanpa retry 404); home prefetch kategori + 3 rail paralel di server; layout kategori ter-cache & ikut locale (dulu selalu id); `lib/http.ts` Content-Type hanya bila ada body (hapus preflight CORS GET); NotificationBell hanya saat login. Home 2,0–2,8 → 1,5 s (cache kosong) / ~0,1–0,2 s (terisi); detail 1,3–2,0 → 0,8–1,2 / ~0,1 s; produk tidak ada 10,3 → 1,3 s; request API 82 → 20 per 6 page load. 18 cek Playwright lulus. next build + tsc hijau; eslint 0 error, 4 warning `no-img-element` lama di file yang tidak disentuh. Sesi diawasi Satria.
2026-10-03 · [fe] revamp hero + navbar (gaya referensi Livora) · top bar promo + dropdown bahasa, header transparan di home → putih teks gelap saat scroll/halaman lain, mega-menu Katalog + 3 ruangan dipin, dropdown akun, hero full-bleed crossfade (autoplay tetap). tsc 0, eslint file tersentuh 0; diverifikasi Playwright desktop+mobile. next build belum dijalankan. Detail: docs/state/2026-10-03-claude-revamp-hero-navbar.md
2026-10-03 · [fe] revamp halaman login & register (gaya referensi Livora) · shell toko (top bar+header+footer) di layout `(auth)`, kartu terbelah form/foto via `components/kriya/auth-card.tsx` (foto `public/images/auth-kriya.jpg`, disembunyikan di mobile), label+placeholder, tombol terracotta uppercase, Google tetap di bawah pemisah, tautan login/daftar di bawah kartu; callback OAuth ikut dibungkus kartu. 5 key i18n baru/diubah (id+en). tsc 0, eslint file tersentuh 0, diverifikasi Playwright desktop+mobile. "Lupa password" belum ada (butuh alur reset Supabase). next build belum dijalankan.
2026-10-03 · [fe] field nama + telepon saat daftar · disimpan ke user_metadata saat signUp lalu disalin ke profil (`lib/customer/signup-profile.ts`, hanya kolom kosong) setelah sesi ada di register/login/callback. Validasi telepon = regex BE. tsc 0, eslint 0, diuji Playwright (validasi + tampilan); signUp asli tidak diuji.
2026-10-03 · [fe] payment lifecycle Fase 6 · selesai — hitung mundur tenggat bayar + keadaan "tenggat lewat" & pesan 409 spesifik di /orders/[id]/pay, catatan tenggat di detail pesanan, halaman admin /admin/payment-anomalies (filter open/resolved/all, tandai refunded/ignored) + menu + baris "perlu perhatian" di dashboard; tsc 0, lint tanpa temuan baru. Belum di-commit.
