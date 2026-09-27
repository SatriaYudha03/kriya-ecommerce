# Report I-BE: Checkout v2 backend

**Agent:** I-BE
**Tanggal:** 2026-09-27
**Branch:** `ec/I-BE-checkout-v2`
**Commit SHA terakhir:** (isi setelah push — lihat `git log origin/ec/I-BE-checkout-v2 -1`)
**Status:** sebagian — seluruh kode & DoD teknis (build/vet/test/ownership/any-check) hijau dan **quote + webhook diverifikasi penuh lewat curl ke DB dev**, tapi demo `POST /orders` end-to-end **diblokir bug di luar kepemilikan I-BE** (`internal/catalog/ledger.go` — lihat "Permintaan lintas-domain" di `docs/ec-v2/LOG-I.md`). Semua langkah SEBELUM `Inventory.Reserve` sudah diverifikasi benar terhadap DB dev sungguhan.

## DoD §2.2 — output asli

### 1. `go build ./... && go vet ./... && go test ./...`
```
go build exit: 0
go vet exit: 0
ok  	github.com/kriya-commerce/api/internal/checkout	0.195s
ok  	github.com/kriya-commerce/api/internal/customer	1.800s
ok  	github.com/kriya-commerce/api/internal/middleware	0.213s
ok  	github.com/kriya-commerce/api/internal/promo	0.207s
ok  	github.com/kriya-commerce/api/internal/service	0.710s
(sisa paket: [no test files], termasuk internal/orderflow — sekarang murni alias tipis ke internal/checkout, lihat Log)
```

### 2. tsc/eslint/next build
N/A — task ini tidak menyentuh `apps/web/**` (I-FE terpisah, lihat EKSEKUSI §8.2).

### 3. `check-ownership.sh I-BE origin/main...HEAD`
```
Ownership check passed for agent I-BE.
```

### 4. `any-check.sh`
```
any-check passed.
```

### 5. curl endpoint yang disentuh + respons JSON asli

Semua dijalankan terhadap DB dev sungguhan (Supabase), server lokal port 8085, akun `ec-a@kriya.test` (JWT via `mintjwt`), alamat & kupon uji dibuat lalu **dihapus di akhir sesi** (lihat butir 9).

**`POST /checkout/quote`** (2× LENTERA outdoor lamp, alamat DKI Jakarta, tanpa metode/kupon dipilih → auto-pilih termurah):
```json
{"data":{"lines":[{"variant_id":"46b2c6a3-2571-4065-9511-2ffb84fe297b","product_slug":"lentera-outdoor-lamp","name":"LENTERA outdoor lamp","color":"natural","size":null,"thumbnail_url":"products/lentera-outdoor-lamp-1.jpg","qty":2,"unit_price":1100000,"regular_price":1100000,"discount_amount":0,"subtotal":2200000}],"subtotal":2200000,"discount_total":0,"shipping_options":[{"method_id":"1f434d76-15f1-4227-befb-4de415f62a80","code":"reguler","name":"Reguler","cost":55000,"eta_min_days":3,"eta_max_days":5,"is_free":false},{"method_id":"8c981cfa-abcb-4589-8d98-c2e355e30955","code":"kargo","name":"Kargo","cost":107500,"eta_min_days":5,"eta_max_days":8,"is_free":false},{"method_id":"efa9b8c4-feed-48f5-8f35-bc224ca2e3f8","code":"express","name":"Ekspres","cost":120000,"eta_min_days":1,"eta_max_days":2,"is_free":false}],"selected_shipping_method_id":"1f434d76-15f1-4227-befb-4de415f62a80","shipping_cost":55000,"shipping_discount":0,"tax_amount":223468,"total":2255000,"total_weight_kg":4.4,"coupon":null,"problems":[]}}
```
Ongkir per kg terbukti benar: `kargo` = base 100.000 + per_kg 1.500 × ceil(4.4kg) = 100.000+7.500 = 107.500.

**`POST /checkout/quote`** (sama, + kupon `ECI-TEST10` 10% + metode `kargo` eksplisit):
```json
{"data":{"lines":[{"...","discount_amount":220000,"subtotal":2200000}],"subtotal":2200000,"discount_total":220000,"shipping_cost":107500,"shipping_discount":0,"tax_amount":206869,"total":2087500,"coupon":{"code":"ECI-TEST10","valid":true,"reason":null,"discount_type":"percent"},"problems":[]}}
```

**`POST /orders`** (sama payload) — **gagal di `Inventory.Reserve`** (bug `internal/catalog/ledger.go`, di luar kepemilikan I-BE):
```json
{"error":{"code":"internal","message":"Gagal membuat order"}}
```
Log server pada titik kegagalan:
```
ERROR: syntax error at or near "FOR" (SQLSTATE 42601)
SELECT id, stock FROM "product_variants" WHERE id IN ('46b2c6a3-...') AND FOR UPDATE ORDER BY id ASC
```
Sebelum baris ini, log server membuktikan **PriceLines(lock=true), Evaluate kupon(lock=true), Options ongkir, insert `orders`, insert `order_items` semua sukses** (order baru masuk DB dengan subtotal/discount_total/shipping_cost/tax_amount/total identik dengan quote di atas) — transaksi kemudian **rollback bersih** (dikonfirmasi: `GET /orders` sesudahnya `{"data":[],"meta":{"total":0}}`), tidak ada order "nyangkut".

**Webhook `POST /payments/midtrans/notification`** — diuji dengan order yang di-seed manual (bypass `Inventory.Reserve` yang rusak) supaya transisi `paid` tetap bisa dibuktikan penuh (transisi `paid` tidak menyentuh `Inventory`, hanya `Discounts.Confirm` — jadi valid untuk uji jalur ini):
- **settlement pertama** → `200 {"data":{"status":"ok"}}`; log membuktikan `UPDATE orders SET status='paid', paid_at=...`, `UPDATE coupon_redemptions ... status='applied'` (no-op, tidak ada kupon), `INSERT order_events (...,'pending_payment','paid','payment_gateway',...)`, `INSERT notifications (...'Pembayaran diterima'...)`.
- **settlement duplikat (attempt sama)** → `200 {"data":{"status":"ok"}}`, tidak ada `order_events`/`notifications` baru (idempoten, order sudah `paid`).
- **`expire` setelah `paid`** (notifikasi telat/konflik) → `200 {"data":{"status":"ok"}}`, status order **tidak berubah** (transisi `paid→expired` ditolak `CanTransition`, diserap dengan aman — bukan `InvalidTransitionError` yang bocor sebagai 500).
- **`midtrans_order_id` tidak dikenal** → `404 {"error":{"code":"not_found","message":"order tidak ditemukan"}}`.
- **signature salah** → `403 {"error":{"code":"forbidden","message":"signature tidak valid"}}`.

### 6. Fixtures diperbarui
Tidak ada — task ini backend murni (`apps/web/lib/checkout/fixtures.ts` milik I-FE).

### 7. i18n EN+ID
N/A — tidak ada teks UI baru di jalur ini (semua pesan error lewat `httpx.ErrorResponse.error.message`, dilokalkan FE dari kode error, bukan string BE, sesuai konvensi KRIYA-MASTER §5).

### 8. E2E spec
Belum — `e2e/transaksi.spec.ts`/`e2e/ec-flow.spec.ts` menunggu I-FE (§8.2/§8.3, I-QA baru jalan setelah I-BE **dan** I-FE ter-merge). Unit test Go baru (semua di `internal/checkout/`, plus perbaikan `internal/orderflow`):
- `status_test.go` — seluruh sel tabel §6.1 (`CanTransition`), termasuk pasangan yang TIDAK ada di tabel.
- `transition_test.go` — `planTransition`: transisi invalid, aktor salah, `shipped` tanpa kurir/resi, `paid` men-Confirm kupon, `cancelled`/`expired` melepas stok+kupon, event selalu `NotifyCustomer=true`.
- `order_calc_test.go` — `computeOrderTotals`: metode tidak ditemukan, tanpa kupon, diskon per-baris, `free_shipping` kupon, pajak `prices_include_tax`.
- `order_handler_test.go` — `mapCreateOrderError`: seluruh cabang (`StockProblemError`→409, `CouponInvalidError`→409, `InsufficientStockError` race→409, `ErrAddressNotFound`→404, `ErrShippingMethodUnavailable`→409, default→500).
- `payment_handler_test.go` — `attemptStatusFor`.

### 9. Data uji dibersihkan
Ya — diverifikasi manual:
- Alamat uji `[ec-i] Test` (`DELETE /addresses/:id` → `200`).
- Kupon uji `ECI-TEST10` (`DELETE /admin/coupons/:id` → `200`).
- Order yang di-seed manual untuk uji webhook (`e6ebdf38-...`) + notifikasinya dihapus lewat query langsung (tidak ada endpoint DELETE order — order ini dibuat manual via SQL, bukan lewat API, khusus untuk membuktikan webhook karena `Inventory.Reserve` rusak).
- Tidak ada order/`order_items`/`payment_attempts` sisa dari percobaan `POST /orders` yang gagal (rollback transaksi otomatis, dikonfirmasi `GET /orders` kosong).
- File Go sementara (`cmd/seedtest/`) dan `.env` lokal (disalin dari root untuk uji, digitignore) dihapus sebelum commit — **tidak ter-commit**.

## Permintaan lintas-domain
Lihat `docs/ec-v2/LOG-I.md` — ringkasan:
1. **BLOKIR demo penuh:** `internal/catalog/ledger.go` (+`admin_repo.go`) memakai `.Clauses(gorm.Expr("FOR UPDATE"))` yang bukan clause GORM valid → `Inventory.Reserve/Release/Restock` SELALU gagal dengan syntax error saat benar-benar dipanggil ke DB nyata. Fix mekanis 1 baris × 5 lokasi (sama seperti fix yang saya terapkan di `internal/checkout/pricing.go`), tapi di luar kepemilikan `internal/checkout/**` saya.
2. Setelah #1 diperbaiki: `internal/aftersales/{admin_handler,order_handler,routes}.go` perlu mengganti `dummyPorts := checkout.Ports{}` menjadi `deps.Ports` (kolomnya sekarang sudah ada & terisi asli).
3. Catatan (bukan blocker): `admin_handler.go.UpdateOrderStatus` fallback ke update status manual untuk SEMUA error `Transition` termasuk `InvalidTransitionError` — begitu port asli aktif, transisi yang seharusnya `409` malah lolos lewat fallback ini.

## Next
1. **Claude/Agent A:** perbaiki 5 titik `FOR UPDATE` rusak di `internal/catalog/**` (lihat detail di LOG-I.md) — begitu ini beres, ulangi persis curl `POST /orders` di atas untuk membuktikan alur penuh sampai `snap_token` terbit.
2. **Claude (merge):** wiring `deps.Ports` ke 3 file aftersales (poin #2 di atas) + tinjau fallback `InvalidTransitionError` di `admin_handler.go` (poin #3).
3. **I-QA:** setelah I-FE ter-merge, jalankan `e2e/ec-flow.spec.ts` mencakup kupon+ongkir per kg, expire, dan lanjut bayar (attempt kedua) — kode servernya sudah siap (`ContinuePaymentButton`/B5 tinggal dipakai FE), belum ada test Playwright yang mengujinya end-to-end.
