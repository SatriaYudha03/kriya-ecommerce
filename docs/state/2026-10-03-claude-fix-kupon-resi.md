# Sesi 2026-10-03 — Fix validasi kupon (500) & UX form resi admin

- **Task**: dua laporan Satria dari UI: (1) kupon `ECC-DISKON10` di checkout gagal dengan pesan generik,
  (2) toast "courier dan tracking_number wajib diisi" di admin.
- **Status**: selesai di kode; `go build ./...` dan `tsc --noEmit` hijau. Belum diuji manual di browser / e2e.
  API Go harus di-restart agar perubahan backend aktif.

## Fitur/bug dicatat

- **Bug kupon (500)**: `checkout.LineInput` tidak punya tag JSON, jadi `variant_id` dari FE tidak ter-bind di
  `POST /api/v1/coupons/validate`; `PriceLines` jalan dengan `variant_id` kosong → `invalid input syntax for type uuid`.
  Perbaikan: `promo/coupon_handler.go` memakai `ValidateLine` (tag `variant_id` uuid-wajib, `qty` min 1) lalu
  dipetakan ke `checkout.LineInput`. Input salah kini 400, bukan 500.
- **Pesan fallback kupon** (`lib/i18n/messages/{en,id}/promo.ts`, key `promo.errors.internal`): kalimat lebih jelas.
- **Form resi admin**: bukan bug — backend menolak status `shipped` tanpa kurir & resi (`checkout/transition.go`).
  Pesan backend diganti bahasa awam; di `admin/orders/[id]/page.tsx` input ditandai wajib dan tombol
  "Perbarui Status" nonaktif sampai kurir + resi terisi. File ini juga memuat perubahan lama (belum ter-commit
  sebelumnya) `params` → `use(params)` untuk Next versi baru.
- **Alur**: kurir & resi diisi **admin** saat mengubah status pesanan ke "Dikirim"; pelanggan hanya melihat hasilnya.

## Permintaan lintas-teritori

- Tidak ada. Catatan untuk AGENT-QA: tambahkan kasus e2e validasi kupon dengan `variant_id` valid (regresi bug 500)
  dan transisi `shipped` tanpa resi.

## Next

Restart API, coba ulang kupon di checkout dan ubah status ke Dikirim di admin.
Pola yang sama (struct dengan tanpa tag JSON dipakai sebagai request body) perlu dicek di handler lain yang
memakai `checkout.LineInput` langsung.
