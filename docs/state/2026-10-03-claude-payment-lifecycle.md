# Sesi 2026-10-03 — Payment lifecycle Fase 1–5 (BE + migrasi)

- **Task**: susun `docs/rencana/RENCANA-PAYMENT-LIFECYCLE.md` lalu kerjakan Fase 1–5 atas instruksi Satria
  (temuan audit K3, K4, T3, T4, sebagian T7 — lihat `2026-10-03-claude-audit-kesiapan-produksi.md`).
- **Status**: Fase 1–5 selesai di kode, `go build` + `go vet` + `go test ./...` hijau (89 test, sebelumnya 76).
  **Belum di-commit. Migrasi 017 belum diterapkan ke Supabase** — API baru membaca/menulis
  `orders.payment_due_at` & `payment_anomalies`, jadi migrasi WAJIB diterapkan sebelum API versi ini jalan.
  Belum diuji end-to-end terhadap DB/Midtrans sandbox (hanya unit test fungsi keputusan).

## Fitur/bug dicatat

- **Migrasi** `supabase/migrations/017_payment_lifecycle.sql`: `orders.payment_due_at` (+ backfill order pending, index parsial) dan tabel `payment_anomalies` (RLS deny-all).
- **Tenggat bayar tetap**: `CreateOrder` mengisi `payment_due_at`; attempt & Snap memakai tenggat yang sama (`checkout/order_repo.go`).
- **State machine**: `ActorSystem` boleh `pending_payment → expired`; `Transition` ke cancelled/expired menutup attempt terbuka (`checkout/status.go`, `checkout/transition.go`).
- **`POST /orders/:id/pay` pindah ke `checkout`** (`checkout/continue_payment.go`): lock order, tanpa perpanjangan tenggat (409 bila < 2 menit), attempt token-NULL diganti (T3), Snap gagal → attempt `failed`, attempt lama ber-token di-cancel di Midtrans. Jalur lama `customer/payment_handler.go` + `payment_repo.go` dihapus. Bentuk respons sama.
- **`PaymentProcessor`** (`checkout/payment_processor.go`): satu jalur untuk webhook, sync, sweeper; `classifyNotification` — bayar atas order tertutup → anomali `paid_after_close`, bayar kedua → `double_payment`, expire/cancel attempt lama tidak lagi mematikan order.
- **Endpoint admin baru** (`checkout/anomaly.go`): `GET /api/v1/admin/payment-anomalies?status=open|resolved|all`, `POST /api/v1/admin/payment-anomalies/:id/resolve` `{"resolution":"refunded"|"ignored","note"}`.
- **Batal customer** (`aftersales/order_handler.go`): cancel semua attempt ber-token di Midtrans, kegagalan di-log.
- **Detail order**: `payment.can_continue`/`expires_at` mengikuti `payment_due_at` (`aftersales/order_handler.go`, `order_repo.go`).
- **Sweeper** (`checkout/sweeper.go`): tiap `PAYMENT_SWEEP_INTERVAL` (default 5m, `0` = mati) expire order lewat tenggat + `PAYMENT_SWEEP_GRACE` (default 10m) setelah cek Midtrans (`decideSweep`: lunas → terapkan; pending → cancel dulu; error → lewati).
- **Server** (`cmd/api/main.go`): `http.Server` dengan timeout + graceful shutdown SIGINT/SIGTERM (sweeper ikut berhenti).

## Permintaan lintas-teritori

- **Satria**: terapkan migrasi 017; tambahkan endpoint admin anomali ke kontrak (RENCANA-ECOMMERCE-V2 §7) dan env `PAYMENT_SWEEP_INTERVAL`/`PAYMENT_SWEEP_GRACE` ke KRIYA-MASTER Bagian 4.
- **AGENT-FE**: Fase 6 — pesan khusus 409 tenggat lewat + hitung mundur di `/orders/:id/pay`; halaman admin "Anomali pembayaran".
- **AGENT-DEVSECOPS**: env sweeper di Helm values; `terminationGracePeriodSeconds` ≥ 35s agar graceful shutdown 30s sempat jalan; alert log `PAYMENT ANOMALY`.
- **AGENT-QA**: skenario Fase 7 di rencana (sandbox Midtrans).

## Next

Terapkan migrasi 017 → uji manual skenario Fase 7 di sandbox → commit. Lalu paket audit berikutnya
(Midtrans production via env + `fraud_status`, K2/K6).

## Tambahan: celah 1 (sesi yang sama)

- `checkout/payment_close.go` `ClosePayableAttempts`: batal di Midtrans dulu, order ditutup hanya bila tidak ada yang masih bisa dibayar. Dipakai sweeper, `aftersales.CancelOrder`, dan `AdminHandler.UpdateOrderStatus` (→ cancelled).
- `service.CancelTransaction` membaca `status_code` body (+ `TestCancelTransaction`).
- Respons baru saat batal: 409 `invalid_status` (ternyata sudah lunas), 502 `payment_error` (Midtrans belum pasti batal).
- FE `useCancelOrder`: 409 → refresh data pesanan.
- `go test ./...` 90 lulus; `tsc` & eslint bersih untuk file yang disentuh.
