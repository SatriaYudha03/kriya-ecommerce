# Rencana: Perbaikan siklus hidup pembayaran (payment lifecycle)

> Dokumen rencana (handoff). Disusun 2026-10-03 dari audit
> `docs/state/2026-10-03-claude-audit-kesiapan-produksi.md` (temuan K3, K4, T3, T4, + sebagian T7).
> Ikuti teritori & ritual sesi di `docs/agents/KRIYA-MASTER.md`.
> **Status:** Fase 1–5 (BE + migrasi) dan Fase 6 (FE) dikerjakan 2026-10-03 atas instruksi Satria —
> lihat `docs/state/2026-10-03-claude-payment-lifecycle.md` & `docs/state/2026-10-03-fe-payment-lifecycle-fase6.md`.
> Fase 7 (QA, kontrak, operasional) belum.

## Context — masalah yang diperbaiki

| Kode audit | Masalah | Akar |
|---|---|---|
| K3 | Order `pending_payment` tidak pernah kedaluwarsa bila pembeli tidak memilih metode bayar di Snap → stok & kuota kupon tertahan selamanya (juga vektor serangan "borong stok"). | Tidak ada job; `pending→expired` hanya untuk aktor `payment_gateway`; `POST /orders/:id/pay` memperpanjang reservasi tanpa batas. |
| K4 | Pembayaran yang masuk setelah order `cancelled`/`expired` diabaikan diam-diam — uang terpotong, order mati, tanpa jejak. | Webhook menelan `InvalidTransitionError`; batal customer hanya membatalkan attempt `active` di Midtrans, best-effort, error dibuang. |
| T3 | Attempt `active` dengan `snap_token` NULL (Snap gagal disimpan / proses mati) → `/pay` mengembalikan token kosong sampai 24 jam. | `customer.PayOrder` menganggap attempt aktif yang belum expired selalu valid. |
| T4 | Dua jalur pembuatan attempt tidak konsisten → risiko bayar dobel. | `customer.PayOrder` membuat Snap **tanpa expiry**, men-supersede tanpa cancel di Midtrans, tanpa lock. |
| T7 (sebagian) | Deploy memutus request yang sedang berjalan (memicu T3); server tanpa timeout. | `r.Run()` tanpa `http.Server`/graceful shutdown. |

**Di luar cakupan** (paket lain di audit): Midtrans production via env (K2), `fraud_status` (K6), rate limiting (T1), refund admin (T2).

## Prinsip desain

1. **Satu tenggat bayar per order** — kolom baru `orders.payment_due_at` = `created_at + pending_payment_ttl_minutes`, ditetapkan sekali saat order dibuat dan **tidak pernah diperpanjang**. Setiap attempt (`payment_attempts.expires_at`) dan expiry Snap disamakan dengan tenggat ini. Akibatnya: paling banyak satu attempt yang bisa dibayar pada satu waktu, dan reservasi stok punya batas atas.
2. **Hanya satu jalur pembuatan attempt** — di paket `checkout` (pemilik `payment_attempts`). Jalur lama di `customer` dihapus.
3. **Jangan pernah meng-expire order yang masih bisa dibayar** — sweeper menanyakan Midtrans dulu; attempt yang masih `pending` di Midtrans di-cancel dulu, dan bila cancel gagal order dilewati (dicoba lagi tick berikutnya).
4. **Uang yang masuk tidak boleh hilang tanpa jejak** — pembayaran atas order tertutup / pembayaran kedua dicatat di tabel `payment_anomalies` + log `PAYMENT ANOMALY`, dan admin punya endpoint untuk menindaklanjuti.
5. Idempoten di semua jalur (webhook, sync, sweeper, multi-replika): korektnes dijaga oleh `FOR UPDATE` pada baris order + `CanTransition`, bukan oleh "hanya satu proses yang jalan".

## Fase 1 — Migrasi `017_payment_lifecycle.sql` (bersama, BE)

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_due_at timestamptz;
-- backfill order yang masih menunggu: pakai expires_at attempt TERAKHIR (paling longgar,
-- supaya VA yang masih hidup tidak dipotong), fallback created_at + TTL toko.
UPDATE orders o SET payment_due_at = COALESCE(
  (SELECT MAX(pa.expires_at) FROM payment_attempts pa WHERE pa.order_id = o.id),
  o.created_at + make_interval(mins => (SELECT pending_payment_ttl_minutes FROM store_settings LIMIT 1)))
WHERE o.status = 'pending_payment' AND o.payment_due_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_pending_due ON orders(payment_due_at) WHERE status = 'pending_payment';

CREATE TABLE IF NOT EXISTS payment_anomalies (
  id, order_id → orders, midtrans_order_id, kind ('paid_after_close'|'double_payment'),
  order_status, transaction_status, gross_amount, raw jsonb,
  resolution ('refunded'|'ignored') NULL, resolution_note, resolved_by → profiles, resolved_at,
  created_at, UNIQUE (midtrans_order_id, kind));
ALTER TABLE payment_anomalies ENABLE ROW LEVEL SECURITY;   -- deny-all, akses hanya lewat API
```

Kepemilikan: `payment_anomalies` = Core/Platform (sama seperti `payment_attempts`).
**Perlu diterapkan ke Supabase oleh Satria** (kode Fase 2+ membaca/menulis kolom & tabel ini).

## Fase 2 — State machine & tenggat di CreateOrder (`internal/checkout`)

- `CanTransition`: `pending_payment → expired` juga boleh untuk `ActorSystem` (sweeper). Update `status_test.go`.
- `CreateOrder`: isi `orders.payment_due_at = now + TTL`; `attempt.ExpiresAt` = nilai yang sama.
- `Transition` ke `cancelled`/`expired`: dalam transaksi yang sama, tutup attempt yang masih
  `active`/`superseded` (`failed` untuk cancelled, `expired` untuk expired) supaya FE tidak lagi
  menawarkan attempt itu.

## Fase 3 — Satu jalur "lanjut bayar" (`POST /orders/:id/pay`) di `checkout`

Pindahkan dari `customer/payment_handler.go` + `payment_repo.go` (dihapus) ke `checkout`. Bentuk
respons **tetap** `{snap_token, midtrans_client_key, expires_at}` → FE tidak perlu berubah.

Alur:
1. Transaksi: kunci order `FOR UPDATE` (`id` + `user_id`). Bukan milik user → 404. Status bukan
   `pending_payment` → 409 `conflict`. Sisa waktu ke `payment_due_at` < 2 menit → 409 `conflict`
   ("batas waktu pembayaran sudah lewat") — **tidak ada perpanjangan**.
2. Attempt `active` dengan `snap_token` terisi dan `expires_at` > now → kembalikan apa adanya.
3. Selain itu (token NULL = kasus T3, atau attempt rusak/expired): attempt lama → `superseded`;
   insert attempt baru (`expires_at = payment_due_at`). Commit.
4. Di luar transaksi: Snap dengan expiry = sisa menit ke tenggat. Gagal → attempt baru ditandai
   `failed`, balas 502 `payment_error`. Sukses → simpan token. Attempt lama yang punya token →
   `CancelTransaction` best-effort (dicatat di log bila gagal).
5. Klik ganda: dijaga lock order + unique index `uq_payment_attempts_active`.

## Fase 4 — Webhook/sync: klasifikasi notifikasi + anomali + batal yang tuntas

Fungsi murni `classifyNotification(orderStatus, mapped, attemptPrevStatus)` → aksi:

| Notifikasi | Kondisi | Aksi |
|---|---|---|
| paid | order `pending_payment` | attempt `settled` + `Transition(paid)` |
| paid | attempt ini sudah `settled` sebelumnya | no-op (duplikat) |
| paid | order sudah paid/processing/shipped/completed/refunded | attempt `settled` + anomali `double_payment` |
| paid | order `cancelled`/`expired` | attempt `settled` + anomali `paid_after_close` |
| cancelled/expired | attempt ini `active` & order `pending_payment` | update attempt + `Transition` |
| cancelled/expired | attempt `superseded`/lainnya | update attempt saja (attempt lama tidak boleh mematikan order) |
| pending | — | no-op |

Anomali dicatat idempoten (`ON CONFLICT DO NOTHING`) plus `log.Printf("PAYMENT ANOMALY ...")`.
(Catatan internal di `order_notes` sengaja TIDAK ditulis dari `checkout`: tabel itu milik
domain D dan RENCANA-ECOMMERCE-V2 §5.6 melarang tulis lintas domain — tampilkan anomali di
detail order admin lewat FE Fase 6.)

Endpoint admin baru:
- `GET /api/v1/admin/payment-anomalies?status=open|resolved|all&page=&limit=`
- `POST /api/v1/admin/payment-anomalies/:id/resolve` body `{"resolution": "refunded"|"ignored", "note": "..."}`

Batal oleh customer & admin — **Midtrans dibatalkan DULU, baru order** (revisi "celah 1",
lihat bagian di bawah). Kalau tetap terbayar (balapan detik), Fase 4 menangkapnya sebagai anomali.

`service.TransactionStatus` ditambah `gross_amount` agar anomali dari jalur sync/sweeper lengkap.

Detail order customer (`aftersales`): `payment.expires_at` & `payment.can_continue` memakai
`payment_due_at` (fallback expiry attempt aktif), supaya tombol "Lanjutkan Pembayaran" tidak
muncul setelah tenggat.

## Fase 5 — Sweeper expiry + graceful shutdown

`checkout.ExpirySweeper` (goroutine di `cmd/api/main.go`):
- Tiap `PAYMENT_SWEEP_INTERVAL` (default `5m`, `0` = mati): ambil ≤50 order
  `pending_payment AND payment_due_at < now() - PAYMENT_SWEEP_GRACE` (default `10m`, memberi waktu
  webhook telat).
- Per order: tanya Midtrans status tiap attempt (`active`/`superseded`), lalu fungsi murni
  `decideSweep`:
  - ada `settlement`/`capture` → terapkan lewat jalur webhook (order jadi `paid`);
  - ada `pending` → `CancelTransaction` dulu; gagal → lewati order ini;
  - error menghubungi Midtrans → lewati order ini;
  - sisanya (not found/expire/cancel/deny) → `Transition(expired, ActorSystem)` → stok & kupon lepas, event + notifikasi customer tercatat.
- Multi-replika aman: dua sweeper bersamaan → yang kedua kena `InvalidTransitionError` → diabaikan.

`main.go`: `http.Server` dengan `ReadHeaderTimeout 10s`, `ReadTimeout 30s`, `WriteTimeout 60s`,
`IdleTimeout 120s`; `signal.NotifyContext(SIGINT, SIGTERM)` → hentikan sweeper → `Shutdown` 30s.

Env baru (Bagian 4 KRIYA-MASTER milik Satria — perlu ditambahkan): `PAYMENT_SWEEP_INTERVAL`,
`PAYMENT_SWEEP_GRACE` (keduanya opsional, format durasi Go).

## Fase 6 — FE (AGENT-FE, selesai 2026-10-03)

- Halaman `/orders/:id/pay` & tombol lanjut bayar: tampilkan pesan spesifik untuk 409 (tenggat lewat) dan hitung mundur dari `payment.expires_at`.
- Admin: halaman/daftar "Anomali pembayaran" (endpoint Fase 4) + badge jumlah `open` di dashboard.
- Tidak ada perubahan bentuk respons yang sudah ada.

## Fase 7 — QA, kontrak, operasional (belum)

- Satria: terapkan migrasi 017; tambahkan endpoint admin anomali & env baru ke kontrak
  (RENCANA-ECOMMERCE-V2 §7 / KRIYA-MASTER Bagian 4); tambahkan env ke Helm values.
- QA (sandbox Midtrans):
  1. Checkout → tutup popup tanpa memilih metode → setelah tenggat+grace order `expired`, stok kembali.
  2. Pilih VA → batalkan order → bayar VA via simulator: Midtrans harus menolak (cancel sukses); bila lolos, muncul anomali `paid_after_close`.
  3. Kirim ulang notifikasi settlement yang sama → tidak ada anomali/duplikasi.
  4. Dua attempt (paksa) dibayar dua-duanya → anomali `double_payment`.
  5. Klik "Lanjutkan Pembayaran" bertubi-tubi → hanya satu attempt aktif.
  6. `/pay` setelah tenggat → 409.
  7. Matikan API saat checkout (SIGTERM) → request selesai/ditutup rapi; order dengan token NULL bisa dilanjutkan via `/pay`.
- Pertimbangkan alert (Fase observability) untuk anomali `open` > 0.

## Daftar file (Fase 1–5)

| File | Perubahan |
|---|---|
| `supabase/migrations/017_payment_lifecycle.sql` | baru |
| `services/api/internal/checkout/status.go` (+test) | sistem boleh expire |
| `services/api/internal/checkout/transition.go` | tutup attempt saat cancelled/expired |
| `services/api/internal/checkout/order_repo.go` | `payment_due_at` |
| `services/api/internal/checkout/continue_payment.go` (+test) | baru — `/orders/:id/pay` |
| `services/api/internal/checkout/payment_handler.go` | webhook & sync memakai `PaymentProcessor` |
| `services/api/internal/checkout/payment_processor.go` (+test) | baru — klasifikasi + anomali |
| `services/api/internal/checkout/anomaly.go` | baru — simpan anomali + endpoint admin |
| `services/api/internal/checkout/sweeper.go` (+test) | baru |
| `services/api/internal/checkout/routes.go` | route baru, terima grup admin |
| `services/api/internal/customer/payment_handler.go`, `payment_repo.go`, `routes.go` | jalur lama dihapus |
| `services/api/internal/aftersales/order_handler.go`, `order_repo.go` | cancel semua attempt + log; `can_continue` ikut tenggat |
| `services/api/internal/service/midtrans.go` | `gross_amount` di status |
| `services/api/internal/config/config.go`, `cmd/api/main.go` | env sweeper, http.Server, shutdown |

## Revisi "celah 1" (2026-10-03) — batal di Midtrans sebelum menutup order

Diskusi dengan Satria: halaman anomali hanyalah jaring pengaman; pencegahan yang utama.
Celah terbesar yang tersisa: pembatalan order membatalkan Midtrans *setelah* order ditutup dan
best-effort, jadi kalau cancel Midtrans gagal pembeli masih memegang VA yang sah.

- `checkout.ClosePayableAttempts` (`payment_close.go`) — dipakai sweeper, batal pembeli, dan batal
  admin: cek status semua attempt di Midtrans → ada yang lunas: terapkan, kembalikan
  `ErrOrderAlreadyPaid` (order tidak dibatalkan, 409); status belum pasti / cancel gagal:
  `ErrPaymentStillPayable` (order tetap pending, 502 — coba lagi); selain itu aman → baru `Transition`.
- `service.CancelTransaction` kini membaca `status_code` di body (Midtrans membalas HTTP 200 untuk
  kegagalan seperti 412 "sudah settlement"); `404` → `ErrTransactionNotFound` (tidak ada yang bisa dibayar).
- Admin membatalkan order pending (`PUT /admin/orders/:id/status`) sebelumnya **tidak** membatalkan
  apa pun di Midtrans — kini lewat jalur yang sama.
- FE: 409 saat batal memuat ulang data pesanan (status lunas langsung terlihat).

Sisa anomali yang mungkin: balapan hitungan detik antara cek status dan pembayaran, serta
keterlambatan settlement di sisi bank/Midtrans. Opsi lanjutan (belum diputuskan Satria): pemulihan
otomatis order bila uang masuk setelah ditutup dan stok masih ada.
