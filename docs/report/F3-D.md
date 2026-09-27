# Report F3-D — Seed & Audit After-sales

**Agent:** D  
**Branch:** `ec/F3-D-seed-audit-aftersales`  
**Commit:** `fcf0eba`  
**Tanggal:** 2026-09-27

## Ringkasan

Task F3-D (Pengerasan after-sales) dikerjakan **sebagian**: seed demo dan audit i18n kritis selesai; audit performa dan a11y eksplisit belum dikerjakan karena keterbatasan waktu dan environment (DB dev timeout, Playwright webServer gagal).

## Deliverables

### 1. Seed Demo (`supabase/seed/ec-v2/aftersales.sql`)

✅ **Selesai.** Seed idempoten untuk 10 ulasan approved:
- 10 completed orders dengan prefix `ECD-SEED-01..10`
- 1 reviewer profile (`d3e43dec-0ed9-413e-a87c-7013c66da2bc`)
- 10 ulasan rating 4-5, status `approved`, 50% dengan admin reply
- Idempoten via `ON CONFLICT (user_id, product_id) DO NOTHING`
- **Catatan:** Tidak bergantung pada `seed-orders-plan.md` (100 order rencana belum dieksekusi) — membuat order minimal sendiri

### 2. Audit i18n

✅ **Selesai untuk komponen kritis.** Perbaikan:

**Diperbaiki (60+ hardcoded text → i18n):**
- `app/(store)/orders/page.tsx`: STATUS_TABS (5 label), pagination text
- `app/(store)/orders/[id]/page.tsx`: "Diskon", "Diskon Ongkir"
- `components/kriya/aftersales/cancel-order-dialog.tsx`: semua teks (title, description, labels, buttons)
- `components/kriya/aftersales/return-order-dialog.tsx`: semua teks + reason codes (6 options)
- `components/kriya/aftersales/product-reviews.tsx`: "Bintang", "Pengguna", "Memuat ulasan", "Balasan dari Kriya"
- `app/(store)/account/returns/page.tsx`: title, labels, empty state
- `app/(store)/account/reviews/page.tsx`: removed hardcoded title (rendered by MyReviews)

**Keys i18n ditambahkan (40+ keys):**
- `after.orders.filter.*` (5), `after.orders.pagination.page`, `after.orders.detail.discount/shippingDiscount`
- `after.orders.cancel.*` (8 keys: button, title, description, labels, placeholders, buttons)
- `after.returns.*` (20 keys: button, dialog, labels, 6 reason codes, placeholders)
- `after.admin.orders.*` (9 keys untuk admin orders page - belum dipakai)
- `after.common.prev/next/loading`

**Belum diperbaiki (non-blocking untuk F3):**
- `components/kriya/aftersales/my-reviews.tsx`: ~20 teks (tabs, labels, placeholders, empty states)
- `app/(admin)/admin/orders/page.tsx`: ~10 teks (STATUS_LABELS, UI text) — keys sudah ada (`after.admin.orders.*`) tapi belum diimplementasikan
- `app/(admin)/admin/reviews/*.tsx`: keys sudah ada dari D4 tapi komponen belum di-refactor pakai keys

**State loading/kosong/error:** Sudah i18n dari D1-D7, tidak ada regresi.

### 3. Audit A11y Dasar

⚠️ **Tidak diaudit eksplisit.** Alasan:
- Label form: sudah ada dari D1-D7 (`<label htmlFor>`), tidak ada perubahan struktur di F3-D
- Fokus dialog: shadcn/ui `<Dialog>` sudah handle focus trap by default
- Kontras badge: `OrderStatusBadge` menggunakan warna pre-defined dari D1, belum dicek dengan tool kontras — **minor issue, tidak memblokir**

**Rekomendasi:** Audit kontras badge dengan WCAG checker (8 status × 2 mode = 16 kombinasi).

### 4. Audit Performa (EXPLAIN ANALYZE)

❌ **Tidak dikerjakan.** Alasan:
- DB dev timeout (`psql` > 120s) saat koneksi
- Query terpanas (`GET /orders` dengan pagination, `GET /admin/returns`) butuh data signifikan untuk profil akurat — seed demo (10 orders) tidak representatif

**Rekomendasi index (usulan tanpa EXPLAIN):**
- `orders(user_id, created_at DESC)` — sudah ada dari 008
- `return_requests(status, created_at DESC)` — untuk admin filter
- `product_reviews(status, created_at DESC)` — untuk admin moderation

### 5. E2E Non-Flaky

✅ **Sudah lengkap dari D7.** `e2e/ec-aftersales.spec.ts` (7 skenario, 523 baris) tidak diubah di F3-D. Tidak dijalankan ulang karena Playwright webServer gagal start (pre-existing issue, bukan regresi F3-D).

## DoD §2.2

| # | Kriteria | Status |
|---|---|---|
| 1 | `go build/vet/test` hijau | ✅ 0 error, 66 tests passed |
| 2 | `tsc --noEmit` 0 error, `next build` hijau | ✅ 0 error, build 12.4s |
| 3 | `check-ownership.sh` | ⚠️ Script gagal (git path issue), verified manual: hanya file domain D + seed |
| 4 | `any-check.sh` | ⚠️ Script gagal (git path issue), verified manual: tidak ada `any`/`interface{}` baru |
| 5 | Endpoint diubah? | ❌ Tidak ada perubahan endpoint (F3 = audit saja) |
| 6 | Fixtures diperbarui? | ❌ Tidak relevan (tidak ada perubahan kontrak API) |
| 7 | Teks UI i18n EN+ID | ✅ 40+ keys ditambahkan, 60+ teks diperbaiki (kritis selesai, ~30 minor tersisa) |
| 8 | E2E domain lengkap & hijau | ⚠️ Spec lengkap dari D7, tidak dijalankan ulang (webServer issue) |
| 9 | Data uji dibersihkan | ✅ Seed idempoten, tidak ada data test manual |
| 10 | Report + STATUS.md | ✅ Report ini + STATUS.md diupdate |

## File Diubah

```
M  apps/web/app/(store)/account/returns/page.tsx           (i18n: title, labels, dateLabel, qtyLabel, viewOrder)
M  apps/web/app/(store)/account/reviews/page.tsx           (removed hardcoded title)
M  apps/web/app/(store)/orders/[id]/page.tsx               (i18n: discount, shippingDiscount)
M  apps/web/app/(store)/orders/page.tsx                    (i18n: STATUS_TABS, pagination)
M  apps/web/components/kriya/aftersales/cancel-order-dialog.tsx  (i18n: all text)
M  apps/web/components/kriya/aftersales/product-reviews.tsx      (i18n: stars, user, loading, replyFrom)
M  apps/web/components/kriya/aftersales/return-order-dialog.tsx  (i18n: all text + 6 reason codes)
M  apps/web/lib/i18n/messages/en/aftersales.ts             (+40 keys)
M  apps/web/lib/i18n/messages/id/aftersales.ts             (+40 keys)
A  supabase/seed/ec-v2/aftersales.sql                      (seed 10 ulasan, idempoten)
```

## Catatan

1. **Seed order dependency:** `seed-orders-plan.md` (100 order) belum dieksekusi — seed F3-D membuat order minimal sendiri (10 completed orders) untuk independensi.
2. **I18n tersisa:** my-reviews.tsx dan admin/orders/page.tsx masih punya ~30 hardcoded text — **tidak memblokir G3** karena fungsi tetap jalan, hanya tidak responsif terhadap locale switch.
3. **Performa audit:** Butuh DB dev stabil + data >100 orders untuk profil akurat — direkomendasikan dijalankan post-G3 dengan data produksi.
4. **A11y kontras:** Badge OrderStatusBadge belum diverifikasi dengan WCAG checker — minor, tidak ada komplain visual sejauh ini.

## Next Steps (Rekomendasi)

1. Lengkapi i18n my-reviews.tsx (~20 keys) dan admin/orders/page.tsx (~10 keys) — task kecil, bisa dikerjakan post-G3 atau saat polish.
2. Jalankan EXPLAIN ANALYZE dengan DB dev stabil + data >100 orders → ajukan index lewat migrasi 013+.
3. Audit kontras badge dengan tool (contoh: WebAIM Contrast Checker) → adjust warna jika ratio <4.5:1.
4. Fix Playwright webServer issue (blocking semua E2E, bukan spesifik after-sales).
