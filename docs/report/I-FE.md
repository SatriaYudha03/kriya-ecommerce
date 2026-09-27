# Report I-FE: Checkout v2 frontend

**Agent:** I-FE
**Tanggal:** 2026-09-27
**Branch:** `ec/I-FE-checkout-v2`
**Commit SHA terakhir:** `919b659`
**Status:** selesai (FE lengkap sesuai kontrak §7.6; dikembangkan & diuji via fixtures karena I-BE belum ter-implementasi saat sesi ini ditutup — lihat Permintaan lintas-domain)

## DoD §2.2 — output asli (tempel, jangan diringkas jadi "OK" saja)
1. Go build/vet/test: N/A — task ini tidak menyentuh Go.
2. tsc/eslint/next build:
   - `npx tsc --noEmit` → exit 0, tanpa output error.
   - `npx eslint .` → `✖ 4 problems (0 errors, 4 warnings)` — 4 warning `no-img-element` pre-existing di file yang tidak disentuh sesi ini (`app/(admin)/admin/orders/[id]/page.tsx`, `app/(store)/orders/[id]/page.tsx`, `components/kriya/admin/product-form.tsx`, `components/kriya/category-view.tsx`). 0 error, 0 problem baru.
   - `npx next build` → `✓ Compiled successfully in 6.9s`, `Finished TypeScript in 7.4s`, `Generating static pages using 11 workers (31/31)` — hijau, termasuk route `ƒ /checkout`.
3. `bash scripts/ec-v2/check-ownership.sh I origin/main...HEAD` → `Ownership check passed for agent I.`
4. `bash scripts/ec-v2/any-check.sh origin/main...HEAD` (dijalankan dari dalam worktree `agent-ife`) → `any-check passed.`
5. Endpoint yang disentuh: FE saja, memanggil kontrak `POST /checkout/quote` dan `POST /orders` v2 (RENCANA §7.6) lewat `lib/checkout/api.ts`. I-BE belum mengimplementasikan endpoint ini di backend nyata (worktree `agent-ibe` baru berisi commit klaim STATUS.md, 0 baris kode), jadi tidak ada `curl` terhadap API asli yang bisa dilampirkan. Sebagai gantinya, respons fixture (`USE_FIXTURES=true`, dipakai `lib/checkout/fixtures.ts`) untuk `getCheckoutQuote({items:[{variant_id,qty:1}], address_id:"a1", province_code:null, shipping_method_id:null, coupon_code:null})`:
   ```json
   {
     "lines": [{"variant_id":"...","product_slug":"tamu-sofa","name":"TAMU sofa","color":"natural","size":null,"thumbnail_url":"...","qty":1,"unit_price":1800000,"regular_price":1800000,"discount_amount":0,"subtotal":1800000}],
     "subtotal": 1800000, "discount_total": 0,
     "shipping_options": [{"method_id":"ship-reg","code":"reguler","name":"Reguler","cost":20000,"is_free":false,"eta_min_days":3,"eta_max_days":5}, {"method_id":"ship-express","code":"express","name":"Express","cost":45000,"is_free":false,"eta_min_days":1,"eta_max_days":2}],
     "selected_shipping_method_id": "ship-reg", "shipping_cost": 20000, "shipping_discount": 0,
     "tax_amount": 0, "total": 1820000, "total_weight_kg": 8,
     "coupon": null, "problems": []
   }
   ```
   Bentuk field cocok byte-per-byte dengan kontrak §7.6.
6. Fixtures diperbarui: ya — `lib/checkout/fixtures.ts` (quote + createOrderResponse, dibangun dari item keranjang yang sama seperti `lib/customer/fixtures.ts`).
7. i18n EN+ID: ya — `lib/i18n/messages/{id,en}/checkout.ts`, seluruh key prefix `checkoutV2.*` (title, stepAddress/Shipping/Coupon/Note, summary, subtotal/discount/shipping/shippingFree/shippingDiscount/taxIncluded/total, problems, submit/submitting, paymentSuccess/Pending/Error/Closed, orderFailed, loading, loginRequired). Paritas EN/ID dijaga lewat `typeof checkoutId` di file EN (dicek tsc).
8. E2E spec: `e2e/transaksi.spec.ts` ditulis ulang (3 test: tambah ke keranjang, checkout guest → redirect login `next=/checkout`, kunjungi `/checkout` langsung sebagai guest → redirect login). Spec lama menguji route `/produk/tamu-sofa` yang sudah stale sejak 0C merename ke `/products/`. **Tidak bisa diverifikasi hijau** di sandbox sesi ini: `npx playwright test` (baik lewat `npx`, binari lokal `./node_modules/.bin/playwright`, dengan/tanpa `--config` eksplisit) gagal untuk SEMUA spec dalam ~120ms dengan `Cannot navigate to invalid URL` untuk goto relatif, dan `ERR_CONNECTION_REFUSED` untuk goto absolut ke `localhost:3000` — dikonfirmasi ini **bukan regresi dari I-FE**: `katalog.spec.ts` (tidak disentuh sesi ini) gagal identik, baik di worktree `agent-ife` maupun di working copy utama `C:\Porto\kriya-ecommerce` tanpa perubahan apa pun. `pnpm dev` manual di luar Playwright berjalan normal (`Ready`, merespons 200). Kesimpulan: `webServer` Playwright tidak start dengan benar / `baseURL` tidak diterapkan di sandbox ini — dicatat sebagai temuan di LOG-I.md, bukan diperbaiki (file `playwright.config.ts` di luar kepemilikan I). Diverifikasi lewat `npx playwright test transaksi.spec.ts --list` → 3 test terdeteksi tanpa error parse/syntax.
9. Data uji dibersihkan: ya — tidak ada data uji server-side yang dibuat (fixtures-only, tidak ada tulis ke DB dev). File `.env`/`.env.local` yang disalin ke worktree untuk keperluan build lokal tidak di-commit (gitignored, diverifikasi `git status` bersih).

## Permintaan lintas-domain
2026-09-27 · I-FE · TEMUAN: `npx playwright test` tidak bisa dijalankan hijau di sandbox sesi ini untuk spec APA PUN (termasuk `katalog.spec.ts` yang tidak diubah, dan direproduksi juga di working copy utama di luar worktree manapun) — lihat detail di `docs/ec-v2/LOG-I.md`. Ini mempertanyakan validitas klaim "E2E hijau" pada laporan-laporan sebelumnya (A7/B7/C6/D7) *bila diverifikasi ulang di lingkungan yang sama*; kemungkinan lingkungan sandbox sesi-sesi sebelumnya berbeda (mis. browser/OS berbeda) dan tidak mengalami ini. ALASAN: `page.goto` relatif → `Cannot navigate to invalid URL`; `page.goto` absolut → `ERR_CONNECTION_REFUSED`; dev server manual di luar Playwright berjalan normal. MEMBLOKIR: tidak untuk I-FE (kode, tsc, eslint, next build tetap hijau dan terverifikasi), tapi memblokir verifikasi DoD §2.2 poin 8 untuk siapa pun di lingkungan serupa. USULAN: Claude/Satria menyelidiki konfigurasi `webServer` di `playwright.config.ts` root (kemungkinan terkait spawn `pnpm` di Windows/git-bash) sebelum mempercayai status hijau E2E yang diverifikasi di lingkungan serupa, dan menjalankan ulang suite di lingkungan yang terbukti bekerja sebelum G2.

Tidak ada permintaan perubahan kontrak/skema. Signature port Go tidak disentuh (task ini murni FE). Props komponen lintas domain (`AddressPicker`, `ShippingMethodPicker`, `CouponInput`) dipakai sesuai signature beku §5.3, tidak diubah.

## Next
- Setelah I-BE ter-merge: ganti verifikasi fixture di atas dengan `curl` nyata terhadap `POST /checkout/quote` dan `POST /orders` v2, jalankan alur sandbox Midtrans manual (kupon + ongkir per kg + expire), dan re-run `e2e/transaksi.spec.ts` di lingkungan Playwright yang webServer-nya terbukti start dengan benar.
- I-QA (§8.3) baru berjalan setelah I-BE **dan** I-FE ter-merge ke `main` oleh Claude.
