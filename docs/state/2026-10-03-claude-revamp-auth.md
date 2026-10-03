# 2026-10-03 — Revamp halaman login & register (FE)

Konteks: Satria minta tampilan login/register mengikuti referensi Livora (kartu putih terbelah: form kiri, foto interior kanan; tautan beralih di bawah kartu) memakai foto `login-kriya.jpg`.

## Yang berubah (apps/web saja)
- `app/(auth)/layout.tsx` — kini memakai shell toko (`TopBar`, `SiteHeader`, `SiteFooter`, kategori dari `getCategoriesServer`), latar `#f1eee8`.
- `components/kriya/auth-card.tsx` (baru) — `AuthCard` (prop `footer` dirender di luar kartu) + kelas bersama `authLabelClass/authInputClass/authSubmitClass`. Foto statis `public/images/auth-kriya.jpg` (499×592), `placeholder="blur"`, hanya ≥ md.
- `app/(auth)/login/page.tsx`, `register/page.tsx` — form baru (label "*", placeholder, tombol `bg-brand` uppercase), Google SSO tetap di bawah pemisah "atau", judul jadi `sr-only`. Logika auth tidak berubah.
- `app/(auth)/auth/callback/page.tsx` — spinner dibungkus `AuthCard` (dulu kartu dari layout).
- i18n `messages/{id,en}/core.ts`: ubah `auth.login.email|submit|registerNow`, `auth.register.submit|loginHere`; tambah `auth.login.emailPlaceholder|passwordPlaceholder`, `auth.register.passwordHint`.

## Verifikasi
tsc 0 error; eslint file tersentuh 0; screenshot Playwright /login & /register desktop 1312px + mobile 390px sesuai referensi. `next build` belum dijalankan. Belum di-commit.

## Sisa / catatan
- "Forgot password" dari referensi sengaja tidak dibuat — perlu halaman reset (`resetPasswordForEmail` + rute update password). Kandidat task berikutnya.
- Strip putih sebelum footer (dari `mt-16` di `SiteFooter`) diperbaiki khusus layout auth: latar beige kini membungkus main + footer. Halaman toko lain tidak diubah.

## Lanjutan — field nama & telepon saat daftar
- `register/page.tsx`: field "Nama lengkap" + "Nomor telepon" (wajib; `type=tel`, pattern `(\+62|0)8[0-9]{7,12}` sama dengan BE `address_handler.go`, spasi/strip dibuang saat ketik). Dikirim ke `supabase.auth.signUp({ options: { data: { full_name, phone } } })` → tersimpan di `user_metadata`.
- `lib/customer/signup-profile.ts` (baru) `applySignupProfile(user)`: salin `full_name`/`phone` dari metadata ke profil via `GET` + `PUT /api/v1/profile` (digabung karena PUT = replace), hanya mengisi kolom yang masih kosong → idempoten; error ditelan agar login tak gagal. Dipanggil setelah sesi ada di register (tanpa konfirmasi email), login (login pertama setelah konfirmasi email), dan callback OAuth (bonus: nama dari Google ikut terisi).
- i18n: `auth.register.name|namePlaceholder|phone|phonePlaceholder|phoneHint` (id+en).
- Verifikasi: tsc 0, eslint 0; Playwright — validasi telepon `08123456` ditolak, `081234567890` lolos; screenshot form. Alur daftar ke Supabase asli TIDAK diuji (agar tidak membuat user sungguhan).
- Opsional (lintas-teritori DB/BE): trigger `handle_new_user` (001_commerce_core.sql) bisa membaca `raw_user_meta_data->>'full_name'/'phone'` agar profil terisi di DB tanpa bergantung pada login FE pertama. Bukan blocker.
- Foto berbeda untuk daftar: `public/images/auth-signup.webp` (479×720) via prop `image="signup"` di `AuthCard`; login tetap `auth-kriya.jpg`.
