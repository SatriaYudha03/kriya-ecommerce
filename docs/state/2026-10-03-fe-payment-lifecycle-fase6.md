# Sesi 2026-10-03 — [fe] Payment lifecycle Fase 6

- **Task**: Fase 6 `docs/rencana/RENCANA-PAYMENT-LIFECYCLE.md` — sisi FE untuk tenggat bayar tetap & anomali pembayaran (BE Fase 1–5: `2026-10-03-claude-payment-lifecycle.md`).
- **Status**: selesai di kode. `npm run build` hijau (route `/admin/payment-anomalies` terdaftar); `npx tsc --noEmit` 0 error; `npx eslint` tanpa temuan baru (1 error + 7 warning yang tersisa sudah ada sebelumnya di file lain: `admin/orders/page.tsx`, `lib/customer/types.ts`, `admin-reviews.tsx`, `<img>` lama). **Belum di-commit.** Belum dicoba di browser terhadap API live (migrasi 017 belum diterapkan).

## Fitur dicatat

- `lib/checkout/payment-window.ts` — helper tenggat: `isPaymentWindowClosed` (sisa < 2 menit = tutup, sama dengan BE `minPaymentWindow`), `formatCountdown`.
- `components/kriya/customer/payment-countdown.tsx` — `useNow`, `PaymentCountdown` (halaman bayar), `PaymentDeadlineNote` (detail pesanan).
- `app/(store)/orders/[id]/pay/page.tsx` — hitung mundur menggantikan teks "Bayar sebelum"; setelah tenggat: tombol bayar diganti panel "Batas waktu pembayaran sudah lewat" + tautan belanja lagi; 409 dari `POST /orders/:id/pay` → pesan spesifik (tenggat lewat bila order masih pending, selain itu "tidak lagi menunggu pembayaran") + refresh order.
- `app/(store)/orders/[id]/page.tsx` — catatan sisa waktu bayar / tenggat lewat di header untuk order `pending_payment`.
- Admin: `app/(admin)/admin/payment-anomalies/page.tsx` + `components/kriya/admin/payment-anomaly-card.tsx` — daftar anomali (filter Perlu tindakan / Selesai / Semua, paginasi), nominal masuk vs total pesanan, ID Midtrans, status order saat terdeteksi, tindak lanjut "Tandai sudah direfund" / "Abaikan" + catatan.
- Menu admin "Anomali Bayar"; dashboard "Perlu perhatian" menampilkan jumlah anomali terbuka paling atas.
- Data: `lib/checkout/{types,api,queries,fixtures}.ts` (`PaymentAnomaly`, `getAdminPaymentAnomalies`, `resolvePaymentAnomaly`, `useAdminPaymentAnomalies`, `useOpenPaymentAnomalyCount`, `useResolvePaymentAnomaly`; fixture 1 anomali contoh).
- i18n ID/EN: `checkoutV2.pay.*` baru, `adminPay.*`, `nav.admin.paymentAnomalies`.
- `ContinuePaymentButton` (tidak dipakai di halaman mana pun saat ini) tidak diubah.

## Permintaan lintas-teritori

- Satria: endpoint `GET/POST /api/v1/admin/payment-anomalies…` perlu masuk kontrak (sudah diajukan di sesi BE).

## Next

Fase 7: terapkan migrasi 017 → uji di sandbox: halaman bayar (hitung mundur, tenggat lewat, 409), halaman anomali (buat anomali dengan membayar VA order yang sudah dibatalkan), lalu commit.
