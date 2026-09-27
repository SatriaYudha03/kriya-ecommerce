# Report F3-C: Seed/audit promo

**Agent:** C
**Tanggal:** 2026-09-27
**Branch:** `ec/F3-C-seed-audit-promo`
**Commit SHA terakhir:** `266058b`
**Status:** selesai

## Ringkasan

Task pengerasan (F3) domain promo & laporan, sesuai lingkup §9.1:
1. Seed demo idempoten `supabase/seed/ec-v2/promo.sql`: 3 kupon publik + 2 kupon privat.
2. Audit i18n (teks ID keras), state loading/kosong/error, a11y dasar di halaman
   admin kupon, dashboard, laporan, dan komponen validasi kupon publik.
3. `EXPLAIN ANALYZE` query terpanas domain promo → usulan index dicatat sebagai
   permintaan lintas-domain di `docs/ec-v2/LOG-C.md` (bukan migrasi langsung).
4. Melengkapi spec E2E promo (`e2e/ec-promo.spec.ts`) — menambah 2 skenario baru,
   memperbaiki cleanup test yang berpotensi flaky.

**Bug produksi nyata ditemukan & diperbaiki**: `lib/promo/api.ts` fungsi
`getPublicCoupons()` dan `validateCoupon()` memanggil path salah
(`/api/v1/public/coupons/{public,validate}`, prefix `/public` ganda yang tidak
pernah terdaftar di `routes.go`). Akibatnya banner promo publik di homepage
selalu kosong, dan `CouponInput` di checkout selalu gagal validasi kupon secara
silent meski backend selalu benar. Ini lolos dari C3/C6 sebelumnya karena test
E2E memanggil endpoint API langsung (`request.post`), bukan lewat fungsi FE ini.
Ditemukan saat menulis skenario E2E baru (test 7) yang menguji lewat UI nyata.

## DoD §2.2 — output asli

### 1. Go build/vet/test
```
go build ./...
(tidak ada output = sukses)
go vet ./...
(tidak ada output = sukses)
go test ./...
ok  	github.com/kriya-commerce/api/internal/checkout	(cached)
ok  	github.com/kriya-commerce/api/internal/customer	(cached)
ok  	github.com/kriya-commerce/api/internal/middleware	(cached)
ok  	github.com/kriya-commerce/api/internal/promo	(cached)
ok  	github.com/kriya-commerce/api/internal/service	(cached)
```

### 2. tsc/eslint/next build
```
npx tsc --noEmit
(tidak ada output = 0 error)

npx eslint .
C:\Porto\kriya-wt\agent-c\apps\web\app\(admin)\admin\orders\[id]\page.tsx
  71:44  warning  Using `<img>` could result in slower LCP ...
C:\Porto\kriya-wt\agent-c\apps\web\app\(store)\orders\[id]\page.tsx
  101:33  warning  Using `<img>` ...
C:\Porto\kriya-wt\agent-c\apps\web\components\kriya\admin\product-form.tsx
  691:23  warning  Using `<img>` ...
C:\Porto\kriya-wt\agent-c\apps\web\components\kriya\category-view.tsx
  143:13  warning  Using `<img>` ...
✖ 4 problems (0 errors, 4 warnings)
```
(4 warning pre-existing di file domain A/D, bukan hasil perubahan task ini.)
```
npx next build
  Finished TypeScript in 8.4s ...
```

### 3. check-ownership.sh
```
$ bash scripts/ec-v2/check-ownership.sh C origin/main...HEAD
Ownership check passed for agent C.
```
13 file berubah, semua cocok pola domain C (`lib/promo/**`, `lib/i18n/messages/*/promo.ts`,
`components/kriya/promo/**`, `components/kriya/promo-banner.tsx`,
`components/kriya/admin/coupon-form.tsx`, `app/(admin)/admin/coupons/**`,
`app/(admin)/admin/reports/**`, `app/(admin)/admin/page.tsx`, `e2e/ec-promo.spec.ts`,
`docs/ec-v2/LOG-C.md`, `supabase/seed/ec-v2/promo.sql`).

### 4. any-check.sh
```
$ bash scripts/ec-v2/any-check.sh
any-check passed.
```

### 5. curl endpoint + respons JSON asli

Seed diverifikasi via `psql` langsung ke DB dev (bukan migrasi, file SQL dijalankan manual):
```
$ psql $SUPABASE_DB_URL -f supabase/seed/ec-v2/promo.sql
INSERT 0 5
$ psql $SUPABASE_DB_URL -f supabase/seed/ec-v2/promo.sql   # dijalankan 2x
INSERT 0 5   # idempoten, tidak error, tidak duplikat
```

Endpoint publik (setelah bugfix path di `lib/promo/api.ts`, dites langsung ke Go API):
```
GET http://localhost:8083/api/v1/coupons/public
200
{
  "data": [
    {"code":"ECC-DISKON10","discount_type":"percent","amount":10,"max_discount":100000,
     "min_subtotal":500000,"is_public":true,"is_active":true,"status":"active"},
    {"code":"ECC-HEMAT50K","discount_type":"fixed_cart","amount":50000,
     "min_subtotal":300000,"is_public":true,"is_active":true,"status":"active"},
    {"code":"ECC-GRATISONGKIR","discount_type":"free_shipping","amount":0,
     "min_subtotal":200000,"is_public":true,"is_active":true,"status":"active"}
  ]
}
```

Endpoint admin (2 kupon privat terverifikasi ada, `is_public:false`):
```
GET http://localhost:8083/api/v1/admin/coupons?page=1&limit=20&q=ECC-
Authorization: Bearer <jwt admin@kriya.com>
200
{
  "data": [
    ...3 kupon publik di atas...,
    {"code":"ECC-VIPMEMBER","discount_type":"percent","amount":15,"max_discount":250000,
     "min_subtotal":1000000,"exclude_sale_items":true,"is_public":false,"status":"active"},
    {"code":"ECC-PRIVAT100K","discount_type":"fixed_cart","amount":100000,
     "min_subtotal":750000,"is_public":false,"status":"active"}
  ],
  "meta":{"page":1,"limit":20,"total":5}
}
```

### 6. Fixtures diperbarui
Tidak ada — task ini tidak mengubah bentuk respons API, hanya path yang dipanggil FE
(bug lama) dan teks UI (i18n).

### 7. i18n EN+ID
Ya. 70+ key baru ditambahkan simetris di `lib/i18n/messages/id/promo.ts` dan
`lib/i18n/messages/en/promo.ts`: `adminPromo.coupons.*` (list, filter, pagination),
`adminPromo.redemptions.*` (riwayat pemakaian), `adminPromo.form.*` (form kupon
lengkap), `adminPromo.reports.*` (laporan: judul, interval, metrik, chart),
`adminPromo.dashboard.*` (tabel pesanan terbaru), `promo.applying`/`promo.inputAria`
(state loading & a11y input kupon).

### 8. E2E spec
`e2e/ec-promo.spec.ts` — hijau, 7 test passed, dijalankan 2x berturut-turut dengan
hasil konsisten (tidak flaky):
```
Running 7 tests using 1 worker

  ✓  1 ec-promo.spec.ts:163:7 › 1. CRUD Kupon Admin (17.9s / 21.7s)
  ✓  2 ec-promo.spec.ts:226:7 › 2. Validasi Kupon (API) (21.1s / 19.8s)
  ✓  3 ec-promo.spec.ts:276:7 › 3. Banner promo publik (GET /coupons/public) (7.7s / 7.2s)
  ✓  4 ec-promo.spec.ts:294:7 › 4. Laporan admin (24.6s / 22.5s)
  ✓  5 ec-promo.spec.ts:321:7 › 5. Dashboard v2 (12.2s / 11.0s)
  ✓  6 ec-promo.spec.ts:340:7 › 6. Manajemen Kupon (UI Admin) (16.0s / 14.8s)
  ✓  7 ec-promo.spec.ts:358:7 › 7. Banner Promo & Salin Kode (Storefront) (7.4s / 7.9s)

  7 passed (2.0m)   [x2 runs berturut-turut]
```
Test baru: #6 (buka/tutup dialog form kupon, verifikasi label field via `getByLabel`)
dan #7 (kupon publik baru muncul di banner storefront + tombol salin kode).

### 9. Data uji dibersihkan
Ya. `afterAll` menghapus seluruh kupon dengan kode di `TEST_COUPON_CODES` (daftar
eksplisit: `ECC-CRUD`, `ECC-USED`, `ECC-VALID`, `ECC-EXPIRED`, `ECC-FUTURE`,
`ECC-MIN`, `ECC-LIMIT`, `ECC-PUB-ACTIVE`, `ECC-PRIV`, `ECC-PUB-EXP`,
`ECC-STOREFRONT`) — **bukan** wildcard `code=like.ECC-*` seperti sebelumnya
(wildcard lama ikut menghapus seed demo prefix sama, sumber flaky di test 7).
Verifikasi manual setelah run:
```
psql $SUPABASE_DB_URL -c "SELECT code FROM coupons WHERE code LIKE 'ECC-%' ORDER BY code;"
       code
------------------
 ECC-DISKON10
 ECC-GRATISONGKIR
 ECC-HEMAT50K
 ECC-PRIVAT100K
 ECC-VIPMEMBER
(5 rows)
```
Hanya 5 kupon seed demo tersisa, seluruh data test sudah bersih.

## Permintaan lintas-domain

Lihat `docs/ec-v2/LOG-C.md` bagian "Permintaan lintas-domain", 3 usulan index baru
(hasil `EXPLAIN ANALYZE` nyata terhadap DB dev, dijalankan via program Go sementara):
1. `coupons(created_at DESC) WHERE is_public = true AND is_active = true` — untuk
   `GET /coupons/public` (saat ini Seq Scan + in-memory Sort).
2. `orders(paid_at, status) WHERE paid_at IS NOT NULL` — untuk `ReportSummary`,
   `ReportSales`, `ReportTopProducts` (saat ini Seq Scan pada `orders`).
3. `coupon_redemptions(user_id, coupon_id, status)` — untuk validasi limit kupon
   per user (saat ini Index Scan + filter tambahan pada heap).

Semua ditulis sebagai permintaan (bukan migrasi langsung), sesuai R5.

## Next

F3-Z (Claude/Satria): pertimbangkan 3 usulan index di atas untuk migrasi `013_*`.
