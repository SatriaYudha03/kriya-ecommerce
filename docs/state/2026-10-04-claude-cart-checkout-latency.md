# 2026-10-04 — Cart & checkout terasa lambat (FE + BE)

**Gejala:** tombol +/- cart tidak bisa diklik cepat; diskon kupon lama tampil di Order Summary.

**Penyebab:** (1) `disabled={loading}` mengunci tombol sampai `PUT /cart` selesai; (2) quote checkout
baru jalan setelah alamat dipilih, jadi diskon tidak tampil sebelum itu; (3) `PutCart` query varian 2x.

**Perubahan**
- FE `stores/cart-store.ts`: update optimistis + sync debounce 400 ms, respons basi diabaikan, kenaikan qty dibatasi stok,
  saat PUT ditolak state ditarik ulang dari server (`getCart`). `cart/page.tsx`: tombol tidak lagi disabled saat loading.
- FE `checkout/page.tsx`: quote jalan tanpa alamat; perubahan kupon melewati debounce.
- BE `customer/cart_handler.go`: `PutCart` memvalidasi stok (409 `insufficient_stock`, hanya untuk KENAIKAN qty
  agar item lama dengan stok menyusut tidak memblokir edit lain), varian di-query sekali (validasi + respons),
  validasi paralel dengan baca cart. Stok tetap dicek ulang di quote/order (lock) sebagai penjaga akhir.

**Belum dikerjakan (BE, opsional):** paralelkan/cache query `Quote` (store_settings, Evaluate kupon); pindah region DB (Fase 4 perf).
**Catatan kontrak:** `PUT /api/v1/cart` kini bisa 409 `insufficient_stock` — belum tercatat di KRIYA-MASTER Bagian 6 (perlu Satria).
