# 2026-10-03 · Revamp dashboard admin (FE + BE kecil)

Diminta Satria: dashboard `/admin` lama tidak disukai; referensi "Guestlist Admin" (filter periode, KPI berdeskripsi, donat breakdown, grafik tren).

## Yang berubah
**BE (`services/api/internal/promo`)**
- Endpoint baru `GET /api/v1/admin/reports/breakdown?from&to` → `{order_status: [{status,count}], categories: [{slug,name_i18n,items_sold,revenue}]}`. Status dihitung dari `created_at` (semua status); kategori digulung ke induk (`COALESCE(parent_id,id)`). **Belum ada di kontrak KRIYA-MASTER 6.3** — perlu ditambahkan Satria.
- `/admin/stats`: `recent_orders` kini join `auth.users` → `customer_email` terisi (dulu selalu `''`), limit 6.
- `top-products` + breakdown kategori: produk diambil `COALESCE(oi.product_id, pv.product_id)` — sebagian `order_items` seed tak punya `product_id`, sebelumnya hilang dari laporan.

**FE (`apps/web`)**
- `app/(admin)/admin/page.tsx` ditulis ulang: header + subjudul rentang tanggal, pill "Hari ini", segmented 7/30/90 hari; 4 KPI periode (penjualan bersih, pesanan dibayar, AOV, pelanggan baru) + delta vs periode sebelumnya; tren penjualan (bar, per hari / per minggu utk 90 hari, celah diisi nol); panel "Perlu tindakan" (pengganti bar chart "Task overview"); donat status pesanan & penjualan per kategori (warna terkunci ke entitas, palet divalidasi CVD); produk terlaris; tabel pesanan terbaru (baris bisa diklik).
- `components/kriya/admin/dashboard-widgets.tsx` baru; hook `useReportSummary/Sales/TopProducts/Breakdown` di `lib/promo/queries.ts`; tipe `ReportBreakdown`; key i18n `adminPromo.dash.*` (id+en).

## Verifikasi
`go build` + `go vet` hijau; tsc file dashboard bersih, eslint 0. Playwright (sesi admin dari JWT buatan) 1440px, 30 & 90 hari: render benar, 0 console error.

## Catatan / sisa
- Data seed: 26 order ber-`created_at` di masa depan (s/d 29 Okt 2026) dan ~10 order tanpa `order_items` → angka periode bisa tampak janggal.
- tsc saat ini merah karena `app/(auth)/register/page.tsx` (key `auth.register.name/phone*` belum ada di kamus) — perubahan itu BUKAN dari sesi ini (revisi sign-up dibatalkan Satria).
- Widget chat mengambang ikut tampil di halaman admin dan menutupi pojok kanan panel.
