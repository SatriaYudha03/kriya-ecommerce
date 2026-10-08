# 2026-10-08 — README baru (bahasa Inggris) + screenshot

Peran: Claude (dokumentasi, atas permintaan Satria). Belum di-commit.

## Hasil
- `README.md` ditulis ulang dalam bahasa Inggris: deskripsi aplikasi, tabel screenshot
  (storefront 6 + admin 6), fitur, tech stack, diagram arsitektur + alur checkout/pembayaran
  (Mermaid), struktur proyek, instalasi (env, migrasi, seed, dev.ps1/manual, chatbot, Midtrans
  webhook via tunnel, tes), ringkasan API (dicek terhadap `routes.go`), pedoman dev, status deployment.
- `docs/screenshots/*.png` (1440×900) diambil dengan Playwright dari app lokal (locale `en`,
  badge dev Next disembunyikan). Halaman authed memakai akun admin@kriya.com.

## Catatan
- Run pertama tak sengaja menambah 1 item ke keranjang admin (12→13); sudah dikembalikan ke 12.
- Bug kecil terlihat: dropdown "Change status" di /admin/orders tetap berbahasa Indonesia saat locale `en`.
- TEMUAN KEAMANAN: `e2e/ec-customer.spec.ts` meng-hardcode SUPABASE service_role key dan
  JWT secret sebagai fallback (ter-commit di git). Perlu dipindah ke env + rotasi kunci.

## Lanjutan: fix i18n /admin/orders (FE)
- `app/(admin)/admin/orders/page.tsx`: hapus map `STATUS_LABELS` hardcode Indonesia; dropdown
  "Change status" kini pakai `after.status.*`. Tanggal ikut locale (`en-US`/`id-ID`), paginasi pakai
  `after.common.prev/next` + key baru `after.common.pageOf` (en & id).
- Verifikasi: tsc + eslint bersih; dicek di browser (locale en) — dropdown, tanggal, paginasi English.
  Screenshot `docs/screenshots/admin-orders.png` diperbarui.
- SISA: halaman detail `/admin/orders/[id]` masih hardcode Indonesia seluruhnya (judul, tombol,
  opsi status, placeholder) — belum disentuh.
