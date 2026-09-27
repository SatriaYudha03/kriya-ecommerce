**Task**: Selesaikan permintaan lintas-domain I-BE poin 2 & 3 di `docs/ec-v2/LOG-I.md`, setelah merge
`ec/I-BE-checkout-v2` ke `main` (`1fd6eec`).

**Status**: selesai.

**Fitur/bug diperbaiki**:
- `internal/aftersales/routes.go`, `admin_handler.go`, `order_handler.go`: `dummyPorts :=
  checkout.Ports{}` (struct kosong, no-op) diganti `deps.Ports` asli (sekarang terisi sejak I-BE
  wiring `platform.Deps.Ports` di merge sebelumnya). `NewOrderHandler`/`NewAdminHandler`/
  `NewReturnsHandler` menerima `ports checkout.Ports` sebagai parameter tambahan, disimpan sebagai
  field struct.
- `admin_handler.go` (`UpdateOrderStatus`) dan `order_handler.go` (`CancelOrder`): fallback lama yang
  menangkap SEMUA error dari `orderflow.Transition` (termasuk `InvalidTransitionError`) lalu memaksa
  update status manual — dihapus. Sekarang error dari `Transition` dipetakan: `InvalidTransitionError`/
  `MissingShipmentInfoError` → `409 invalid_transition`, error lain → `500 internal`. Ini menutup
  catatan #3 I-BE (fallback yang akan meloloskan transisi tidak valid begitu port asli aktif).
- `CancelOrder`: setelah transisi `cancelled` berhasil, sekarang query `payment_attempts` (status
  `active`) untuk `order_id` terkait dan panggil `midtrans.CancelTransaction(...)` best-effort (gagal
  tidak menggagalkan pembatalan order) — menutup catatan I-BE soal `CancelTransaction` yang sudah
  diimplementasikan tapi belum dipakai di jalur ini.
- Verifikasi: `go build ./...`, `go vet ./...` bersih; `go test ./...` semua paket hijau (tidak ada
  test file untuk `aftersales`, jadi tidak ada regresi test untuk diverifikasi otomatis di sini — perlu
  smoke test manual/E2E oleh I-QA). `any-check.sh` bersih. `check-ownership.sh` menandai 3 file ini
  "owned by D, modified by Claude" — diharapkan (perbaikan lintas-domain yang diminta eksplisit I-BE,
  bukan pelanggaran baru).

**Permintaan lintas-teritori**: tidak ada baru — ini menutup permintaan I-BE yang sudah ada.

**Next**:
1. **I-QA**: setelah I-FE ter-merge, uji `POST /admin/orders/:id/status` dengan transisi tidak valid
   (harus 409, bukan lolos) dan `POST /orders/:id/cancel` (harus benar-benar melepas stok/kupon lewat
   `Ports.Discounts`/`Inventory`, dan best-effort cancel Midtrans jika ada attempt aktif).
2. Tidak ada follow-up F2 lain yang diketahui terbuka dari sisi backend I-BE per `LOG-I.md`.
