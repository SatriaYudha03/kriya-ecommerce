# 2026-09-29 — FE — Fix login/checkout redirect loop

## Task
Perbaiki bug: user sudah login tapi diarahkan ke /login lagi saat menuju
/checkout, berulang-ulang (dilaporkan Satria).

## Status
Selesai.

## Root cause
- `lib/supabase.ts` memakai `createClient` polos dari `@supabase/supabase-js`
  → sesi login hanya tersimpan di `localStorage` browser, tidak pernah
  ditulis sebagai cookie.
- `proxy.ts` (gate server-side untuk `/profile`, `/checkout`, `/orders/*`,
  `/account/*`) mengecek keberadaan cookie `sb-*-auth-token` untuk
  memutuskan user sudah login atau belum.
- Karena cookie itu tidak pernah ada, `proxy.ts` selalu menganggap user
  belum login dan redirect ke `/login`, walau client (via `AuthProvider` /
  `useAuth`) sudah punya sesi valid di localStorage. User yang sudah login
  tetap kena bounce tiap kali menyentuh rute terproteksi → terasa "loop".

## Fix (disetujui Satria — nambah dependency)
- Tambah `@supabase/ssr` (paket resmi Supabase untuk sinkronisasi sesi
  client ⇄ middleware lewat cookie).
- `lib/supabase.ts`: `createClient` → `createBrowserClient` dari
  `@supabase/ssr`. Sesi sekarang ditulis ke cookie `sb-<ref>-auth-token`
  (atau dipecah jadi `sb-<ref>-auth-token.0`, `.1`, ... kalau JWT besar),
  selain tetap tersedia di localStorage untuk client.
- `proxy.ts:15`: cek cookie diubah dari `c.name.endsWith("-auth-token")`
  jadi `c.name.includes("-auth-token")` supaya cocok juga dengan cookie
  yang dipecah (chunked).

## Verifikasi
- `pnpm tsc --noEmit`: 0 error.
- `pnpm eslint .`: 0 error (4 warning pre-existing, tidak terkait).
- `pnpm build`: hijau, `/checkout` dkk tetap ter-generate sebagai dynamic
  route, `Proxy (Middleware)` terpasang.
- **Belum diverifikasi end-to-end di browser** (tidak ada kredensial akun
  test tersedia di sesi ini) — perlu login manual lalu buka `/checkout`
  untuk konfirmasi cookie `sb-*-auth-token` muncul di DevTools dan tidak
  ada lagi redirect loop.

## Next
- Satria/QA: uji manual login → checkout di browser untuk konfirmasi
  perbaikan bekerja di praktik, terutama untuk akun dengan JWT besar
  (cek apakah cookie ke-chunk).
- File belum di-commit — menunggu instruksi Satria untuk commit/push.
