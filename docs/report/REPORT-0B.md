# Laporan Task 0B - Go Refactor

**Status:** Selesai
**Branch:** `ec/0B-go-refactor`

**Perubahan:**
- Hapus `handler`, `repository`, `model`.
- Pindah kode ke domain vertikal: `catalog`, `customer`, `aftersales`, `promo`, `checkout`.
- Buat `httpx`, `platform`, `orderflow` (termasuk unit test `CanTransition`), `checkout.Ports`.
- Buat `ports_legacy.go` di tiap domain untuk implementasi awal.
- Buat `PriceLines` di `checkout/pricing.go`.
- Wiring ulang `main.go`.

**Verifikasi:**
- `go test ./...` hijau.
- Tidak ada perubahan perilaku.

**Selanjutnya:**
Tunggu 0A, 0C, 0D selesai. Merge di gerbang G0.
