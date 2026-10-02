# 2026-10-03 — Sync status pembayaran Midtrans (pull) + fix 401 /orders

Peran: BE+FE (diminta langsung oleh Satria, di luar alur EC-v2).

## Masalah
1. Order tetap `pending_payment` setelah bayar di Midtrans Payment Simulator. Status
   hanya diubah webhook `POST /payments/midtrans/notification`, yang tidak bisa
   menjangkau localhost. Untuk VA, Snap memanggil `onPending` (bukan `onSuccess`) karena
   pembayaran terjadi di luar popup.
2. `/orders` saat di-refresh menampilkan "Please log in" walau sesi valid: token getter
   dipasang di `useEffect` AuthProvider, yang jalan SETELAH effect query anak -> request
   tanpa Authorization -> 401.

## Perubahan
- BE `service/midtrans.go`: `GetTransactionStatus` (GET /v2/{id}/status, sandbox),
  `ErrTransactionNotFound` (HTTP 404 / body status_code "404"). Test httptest.
- BE `checkout/payment_handler.go`: inti webhook diekstrak ke `applyTransactionStatus`
  (dipakai webhook & sync). Endpoint baru `POST /api/v1/orders/:id/payment/sync`
  (authed, milik user): cek semua midtrans_order_id (attempt active/superseded terbaru
  dulu + payments lama). `paid` berlaku dari attempt mana pun; cancel/expire hanya dari
  attempt terbaru. Respons `{data:{status}}`. 502 jika Midtrans tak terjangkau sama sekali.
- FE: `syncPayment` (lib/checkout/api.ts), `SyncPaymentResponse`, hook `usePaymentSync`
  (sync saat buka halaman order pending, saat tab fokus, tiap 15 dtk). Dipanggil juga
  setelah popup Snap di checkout & ContinuePaymentButton.
- FE `auth-provider.tsx`: `setAccessTokenGetter` dipindah ke level modul.

## Belum / catatan
- Endpoint `/orders/:id/payment/sync` BELUM tercatat di KRIYA-MASTER Bagian 6 (permintaan
  lintas-teritori: tambahkan ke 6.5 Integrasi Checkout v2).
- API harus di-restart (`go run ./cmd/api`) agar endpoint aktif. Belum diuji end-to-end
  ke Midtrans sandbox; diverifikasi via go test + tsc + eslint.

## Tambahan: thumbnail order rusak
- Query aftersales (`img.storage_path as thumbnail_url`) mengirim path mentah
  `products/x.jpg` ke FE -> browser memuat `/orders/products/x.jpg` -> gambar rusak.
- Fix: `aftersales/thumbnail.go` (`thumbnailURL` -> `storage.PublicImageURL`),
  `supabaseURL` diset di `RegisterRoutes`; dipakai di order_handler (daftar/detail/admin
  via ToOrderResponse), reviews_handler, returns_handler. URL publik terverifikasi 200.

## Tambahan: halaman bayar terpisah `/orders/[id]/pay`
- Checkout tidak lagi membuka Snap: submit ("Buat Pesanan") -> POST /orders -> kosongkan
  keranjang -> `router.replace(/orders/:id/pay)`. Snap.js tidak lagi dimuat di checkout.
- Halaman bayar: ringkasan (total, batas waktu `payment.expires_at`, item), tombol "Bayar
  Sekarang" -> POST /orders/:id/pay (pakai ulang snap_token attempt aktif) -> Snap ->
  sync. `usePaymentSync` jalan di halaman ini; saat status bukan pending lagi -> redirect
  ke /orders/:id (toast sukses bila lunas saat halaman terbuka).
- Link "Lanjutkan Pembayaran" di /orders dan /orders/:id sebelumnya ke
  `/checkout?order_id=` (diabaikan checkout -> terlempar ke /cart); kini ke halaman bayar.
- `ContinuePaymentButton` tidak dipakai di mana pun (sudah begitu sebelum sesi ini).
- i18n baru: `checkoutV2.pay.*` (en/id); `checkoutV2.submit` -> "Place Order"/"Buat Pesanan".
