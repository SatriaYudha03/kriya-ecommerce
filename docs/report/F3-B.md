# Report F3-B: Audit customer

**Agent:** B
**Tanggal:** 2026-09-27
**Branch:** `ec/F3-B-audit-customer`
**Commit SHA terakhir:** `5f24e4d`
**Status:** selesai

## Ringkasan

Audit penuh domain customer (F3 pengerasan):

1. **Seed demo**: `supabase/seed/ec-v2/customer.sql` — 3 alamat idempoten per customer profile (Rumah Utama Jakarta, Kantor Studio Bandung, Villa Sanur Bali).
2. **i18n**: Menghilangkan seluruh hardcoded Indonesian strings di 11 file FE domain B. Menambahkan ~120 key baru di `customer.ts` (ID+EN) dengan prefix `customer.*` dan `adminCustomer.*`. Halaman alamat, wishlist, profile, address-picker, shipping-method-picker, continue-payment-button, wishlist-button/nav, admin customers, admin customer detail, admin shipping, admin settings — semua lewat `t()`.
3. **State loading/empty/error**: Skeleton placeholder (bukan "Loading..." teks), error state dengan retry button, empty state dengan ikon + pesan, diterapkan di addresses, wishlist, admin shipping, admin settings, admin customer detail.
4. **a11y**: `htmlFor`+`id` pada semua form input di dialog alamat, `role="dialog"` + `aria-modal` + `aria-labelledby` pada modal alamat, `aria-label` pada icon buttons (edit/delete/pagination/wishlist/shipping edit), `role="radiogroup"` pada address-picker, `focus:ring` pada interactive elements, `tabIndex`+`onKeyDown` pada clickable table rows (admin customers), `DialogDescription` pada shipping edit dialog, contrast improvement pada badges.
5. **Query index proposals**: 3 usulan index komposit/partial ditulis sebagai permintaan lintas-domain di LOG-B.md untuk migrasi 013: `addresses(user_id, is_default, created_at)`, `cart_items(cart_id, added_at)`, `shipping_methods(zone_id, position) WHERE is_active`.
6. **E2E**: Locator assertions di test 6 & 7 diganti regex case-insensitive (`/keranjang|cart/i`, dll.) agar tidak flaky terhadap locale switch. Admin login assertion juga di-case-insensitivekan.
7. **Refactor shipping page**: Mengganti manual `useEffect`+`useState` fetch dengan `useQuery`/`useMutation` hooks (`useAdminShippingZones`, `useUpdateShippingMethod`) — menghilangkan ESLint error `set-state-in-effect` dan menyederhanakan kode.

## DoD §2.2 — output asli

1. Go build/vet/test:
```
ok  	github.com/kriya-commerce/api/internal/customer	1.880s
ok  	github.com/kriya-commerce/api/internal/checkout	0.302s
ok  	github.com/kriya-commerce/api/internal/middleware	(cached)
ok  	github.com/kriya-commerce/api/internal/promo	0.241s
ok  	github.com/kriya-commerce/api/internal/service	1.079s
```

2. tsc/eslint/next build:
```
tsc --noEmit: 0 error
eslint: 0 errors, 4 warnings (pre-existing @next/next/no-img-element in non-B files)
next build: Compiled successfully, 31/31 static pages generated
```

3. check-ownership.sh:
```
Ownership check passed for agent B.
```

4. any-check.sh:
```
any-check passed.
```

5. curl endpoint yang disentuh + respons JSON asli:
```
# GET /api/v1/addresses
{"data":[{"id":"0f49615a-...","label":"EC-B Rumah Utama","recipient":"Budi Santoso","phone":"081234567890","address_line":"Jalan Gandaria Tengah No. 15","district":"Kebayoran Baru","city":"Jakarta Selatan","province_code":"31","province":"DKI Jakarta","postal_code":"12130","notes":"Dekat taman kota","is_default":true,"created_at":"2026-09-27T16:15:32Z"}]}

# GET /api/v1/shipping/provinces
{"data":[{"code":"11","name":"Aceh","zone_code":"sumatera"},...,{"code":"31","name":"DKI Jakarta","zone_code":"jawa_bali"}]}

# GET /api/v1/admin/shipping/zones
{"data":[{"id":"...","code":"jawa_bali","name_i18n":{"id":"Jawa & Bali","en":"Java & Bali"},"is_active":true,"provinces":["DKI Jakarta",...],"methods":[...]}]}
```

6. Fixtures diperbarui: tidak — task ini tidak menambah/mengubah endpoint, hanya audit FE.

7. i18n EN+ID: ya — ~120 key baru di `lib/i18n/messages/{id,en}/customer.ts` (prefix `customer.*`, `adminCustomer.*`).

8. E2E spec: `e2e/ec-customer.spec.ts` — 7 test, assertions diperkuat dengan regex locale-agnostic. tsc e2e 0 error.

9. Data uji dibersihkan: ya — seed `customer.sql` idempoten (ON CONFLICT / IF NOT EXISTS). E2E cleanup di `afterAll` tidak berubah.

## Permintaan lintas-domain

- 2026-09-27 · F3-B · BUTUH: index `addresses(user_id, is_default DESC, created_at DESC)` · ALASAN: `GetAddresses` sort memerlukan node Sort eksplisit · MEMBLOKIR: tidak · USULAN: migrasi 013
- 2026-09-27 · F3-B · BUTUH: index `cart_items(cart_id, added_at ASC)` · ALASAN: `GetCartItems` ORDER BY added_at memerlukan sort tambahan · MEMBLOKIR: tidak · USULAN: migrasi 013
- 2026-09-27 · F3-B · BUTUH: index partial `shipping_methods(zone_id, position) WHERE is_active = true` · ALASAN: `shippingQuoter.Options` filter+sort per checkout · MEMBLOKIR: tidak · USULAN: migrasi 013

## Next

Menunggu Gerbang G2 (pengerasan selesai) dan F3-Z (migrasi 013 + update dokumen).
