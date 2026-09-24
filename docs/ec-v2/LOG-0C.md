# Log Eksekusi Agent 0C

## Task 0C: Restrukturisasi FE
- `lib/http.ts` diekstrak dari `lib/api.ts` lama.
- Modul domain `lib/{catalog,customer,promo,aftersales}/{types,api,queries,fixtures}.ts` dibuat.
- `lib/checkout/types.ts` dan `fixtures.ts` dibuat untuk v2.
- File-file lama diubah menjadi barrel export bernama (`lib/api.ts`, `lib/types.ts`, `lib/queries.ts`, `lib/admin-queries.ts`, `lib/fixtures/index.ts`).
- `lib/snap.ts` diekstrak dari `app/(store)/checkout/page.tsx` tanpa merusak fungsionalitas.
- i18n dipecah ke domainnya (`core.ts`, `catalog.ts`, `customer.ts`, `promo.ts`, `aftersales.ts`, `checkout.ts`).
- Stubs §5.3 dibuat dan WishlistNavButton & NotificationBell dipasang.
- AccountNav dan stubs halaman §5.5 dibuat.
- Guard login (Next 16 middleware) dibuat di `proxy.ts` (root project).
- Primitive shadcn ditambahkan via pnpm.
- Eslint warning dibersihkan.
- tsc, eslint, next build hijau.

## Permintaan lintas-domain
- Tidak ada.