# 2026-10-03 — Admin editor hero beranda (branch feat/admin-hero-editor)

Admin bisa ubah gambar + teks (ID/EN), tautan, urutan, aktif/nonaktif slide hero di `/admin/hero`.

- DB: `supabase/migrations/016_hero_slides.sql` (tabel `hero_slides`, seed 3 slide lama). **Belum diterapkan ke Supabase** — jalankan dulu.
- BE: paket baru `services/api/internal/hero` — `GET /api/v1/hero-slides` (publik, aktif saja), `GET|PUT /api/v1/admin/hero-slides` (PUT = ganti seluruh daftar, 1–8 slide, min. 1 aktif, href harus `/…` atau http(s)).
- FE: `lib/hero/*`, `app/(admin)/admin/hero/page.tsx`, nav admin + i18n `adminHero.*`; `Hero` menerima `slides` dari server (cache 30 dtk), fallback ke slide bawaan i18n bila kosong/gagal.
- Upload gambar memakai bucket `products` (policy admin 006) lewat `uploadProductImage`.
- Di luar teritori satu agent (BE+FE+migrasi sekaligus) atas permintaan langsung Satria. Endpoint baru belum ada di KRIYA-MASTER Bagian 6.
- Belum dites end-to-end di browser.
