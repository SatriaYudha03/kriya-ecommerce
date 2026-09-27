# STATUS — Dashboard Eksekusi KRIYA E-commerce v2

**Ini SUMBER KEBENARAN TUNGGAL status setiap task program EC-v2.**
Klaim opencode, laporan lisan, atau commit di branch **tidak dihitung** sebagai
"selesai" sampai barisnya di tabel ini berstatus ✅ dan seluruh kolomnya terisi.
Kalau tidak ada baris ✅ di sini — **task itu dianggap belum dikerjakan**, titik.

⚠️ **File INI SENDIRI juga bisa salah** — terbukti 2× (0A, 0B, lihat Riwayat audit
di bawah). Kolom Commit di tabel ini HANYA valid kalau berasal dari
`git log origin/<branch> -1` yang baru dijalankan, bukan disalin dari `git branch -v`
lokal atau dipercaya begitu saja dari isi tabel sebelumnya. Siapa pun yang membaca
✅ di sini dan akan mengambil keputusan berdasarkan itu (merge, gerbang, lapor ke
Satria) **wajib reverifikasi sendiri** dengan `git fetch` dulu.

Aturan pakai lengkap: `docs/rencana/EKSEKUSI-PARALEL-V2.md` §0, R18–R20, §11.1 (sweep pra-gerbang).

## Legenda

| Simbol | Arti |
|---|---|
| ⬜ | Belum diklaim / belum dikerjakan |
| 🟦 | Diklaim, sedang dikerjakan |
| 🟥 | Diblokir (lihat kolom Catatan + Permintaan lintas-domain di LOG) |
| ✅ | Selesai — DoD §2.2 hijau, report ditulis, di-push |

## Cara update (WAJIB, lihat R18)

1. **Sebelum mulai task:** ubah barisnya jadi 🟦, isi kolom Agent + Tanggal klaim, commit **hanya file ini** dengan pesan `[ec-status] klaim <ID>`, push, baru mulai kerja.
2. **Sebelum menutup sesi:** ubah jadi ✅ (atau 🟥 bila diblokir total), isi Branch, Commit SHA (7 karakter), link Report, commit `[ec-status] tutup <ID>`, push.
3. Klaim (🟦) yang tidak bergerak > 1 sesi boleh diambil ulang agent lain — catat serah-terima di kolom Catatan.
4. Reviewer (Claude) mengecek baris ini **sebelum** review branch mana pun (lihat EKSEKUSI-PARALEL-V2.md §11 langkah 0).

---

## Gerbang

| Gerbang | Status | Tanggal | Catatan |
|---|---|---|---|
| G0 (fondasi → domain) | ✅ | 2026-09-26 | Migrasi selesai, tag ec-v2-g0 |
| G1 (domain → integrasi) | ✅ | 2026-09-27 | Sweep pra-gerbang (Claude, R19/§11.1): A7/B7/D7 sempat ditandai ✅ di STATUS.md dengan report lengkap tapi **kode belum pernah di-merge ke main** (gap sama seperti 0A/0B) — ditemukan lewat `git merge-base --is-ancestor` = NO untuk ketiganya + `e2e/` di main tidak punya `ec-catalog.spec.ts`/`ec-customer.spec.ts`/`ec-aftersales.spec.ts`. Direview ulang penuh (§11: ownership, build/vet/test, tsc/eslint/next build, any-check) lalu di-merge `d3aa100`. Semua A1–A7/B1–B7/C1–C6/D1–D7 kini genuinely ter-merge & build hijau di main. Ditemukan juga branch lokal `ec/I-BE-checkout-v2` yang belum pernah di-push (bukan kerja nyata, cuma 3 commit status) — dibiarkan, tidak memblokir. |
| G2 (integrasi → pengerasan) | ⬜ | | |
| G3 (rilis) | ⬜ | | |

## F0 — Fondasi

| ID | Task | Status | Agent | Tgl klaim | Branch | Commit | Report | Catatan |
|---|---|---|---|---|---|---|---|---|
| 0D-1 | Golden snapshot | ✅ | 0D | 2026-09-24 | `ec/0D-1-golden-snapshot` | `ea105ba` | — | Belum ada file report formal terpisah; terverifikasi lewat LOG-0D + report 0D (sanity-test negatif terdokumentasi, kredibel) |
| 0D | Tooling baseline QA | ✅ | 0D | 2026-09-24 | `ec/0D-tooling` / fix di `main` | `6c05995` | `docs/report/0D.md` | **Diverifikasi 2026-09-26**: golden.sh/check-ownership.sh/any-check.sh genuinely lulus & kredibel. `mintjwt` sempat GAGAL TOTAL build (`go.mod` tidak ada) — **diperbaiki 2026-09-26** (Claude): `go.mod` terpisah ditambahkan, import diselaraskan ke `jwt/v5`, `go build .`/`go vet .` lulus. |
| 0B | Restrukturisasi Go | ✅ | 0B | 2026-09-24 | `ec/0B-go-refactor` / fix di `main` | `d6257b3` | `docs/report/0B.md` | **Diverifikasi 2026-09-26**: go build/vet/test lulus (29 test), check-ownership lulus. Duplikasi `Response`/`Meta`/`ErrorDetail`/`ErrorResponse` 6x — **diperbaiki 2026-09-26** (Claude): semua import dari `internal/httpx`; sekalian dibersihkan >200 baris scaffolding katalog/checkout yang salah tempel & tidak dipakai di `promo`/`aftersales`. `go build/vet/test` tetap hijau. Sisa `gin.H`/`interface{}` lain di `any-check.sh` terbukti pre-existing dari `main`, belum diperbaiki (di luar scope). |
| 0C | Restrukturisasi FE | ✅ | 0C | 2026-09-24 | `ec/0C-fe-refactor-2` (merged ke main) | `0186854` | `docs/report/0C.md` | **Diperbaiki 2026-09-26** (Claude): `194ecfc` yang diklaim sebagai commit merge ternyata HANYA berisi docs/report+LOG — kode asli (82 file, ~3160 baris: `lib/http.ts`, `lib/<domain>/**`, `lib/checkout/**`, `lib/snap.ts`, `proxy.ts`, split i18n, 17 primitive shadcn) baru benar-benar di-merge ke `main` di `b760761`. tsc/eslint/next-build/go-build-vet-test semua hijau setelah merge + `pnpm install` (paket `cn` dari lockfile 0C). Ini akar penyebab sebagian besar "pelanggaran core" yang ditemukan audit F1 A1/C1/D1 — worktree mereka sudah punya baseline F0 yang benar, `main` yang belum. |
| **0A** | **Migrasi SQL 008–012** | ✅ | 0A (Claude) | 2026-09-26 | `ec/0A-sql-migrations` | `389cd2e` | `docs/report/0A.md` | Diuji lokal (Supabase CLI+Docker): clean apply, backfill, idempotensi 2x, CHECK constraint, fungsi harga sale — semua lulus. Belum diterapkan ke DB dev (tugas G0). Lihat ⚠ verifikasi wajib di report sebelum G0. |

## F1 — Domain (paralel penuh, menunggu G0)

| ID | Task | Status | Agent | Tgl klaim | Branch | Commit | Report | Catatan |
|---|---|---|---|---|---|---|---|---|
| A1 | Status produk & arsip | ✅ | A | 2026-09-26 | `ec/A1-status-produk-arsip` | `e82e21d` | `docs/report/A1.md` | |
| A2 | Harga sale terjadwal | ✅ | A | 2026-09-26 | ec/A2-harga-sale-terjadwal | e161ddf | docs/report/A2.md | |
| A3 | Kategori bertingkat | ✅ | A | 2026-09-26 | `ec/A3-kategori-bertingkat` | `60db1c4` | `docs/report/A3.md` | |
| A4 | Tag, atribut & facet | ✅ | A | 2026-09-27 | `ec/A4-tag-atribut-facet` | `ca8fda4` | `docs/report/A4.md` | `map[string]interface{}` baru di UpdateTag/UpdateAttribute/UpdateAttributeTerm mengikuti pola pre-existing — technical debt repo-wide, bukan pelanggaran A4 saja |
| A5 | Ledger stok | ✅ | A | 2026-09-27 | `ec/A5-ledger-stok` | `7e6af62` | `docs/report/A5.md` | **Diperbaiki 2026-09-27** (Claude, permintaan lintas-domain I-BE, lihat `docs/ec-v2/LOG-I.md`): `internal/catalog/ledger.go` (`Reserve`/`Release`/`Restock`) dan `admin_repo.go` (`UpdateVariantWithLedger`/`AdjustStock`) memakai `.Clauses(gorm.Expr("FOR UPDATE"))` — bukan clause GORM valid, selalu `SQLSTATE 42601` saat benar-benar dipanggil ke DB nyata (`Reserve` SELALU gagal, memblokir `POST /orders` v2 I-BE). Diganti `.Clauses(clause.Locking{Strength: "UPDATE"})` di 5 titik. `go build/vet/test` (66 test) hijau. Bug sama masih ada di `checkout/pricing.go:48` di `main` — sudah diperbaiki I-BE di branch `ec/I-BE-checkout-v2` (belum di-merge), lihat `docs/state/2026-09-27-claude-fix-forupdate-catalog.md`. |
| A6 | Produk terkait & rating | ✅ | A | 2026-09-27 | `ec/A6-produk-terkait-rating` | `7ff9f49` | `docs/report/A6.md` | Di-merge 2026-09-27. Diperbaiki: hapus komentar eslint-disable di product-form |
| A7 | Seed & E2E katalog | ✅ | A | 2026-09-27 | `ec/A7-seed-e2e-katalog` | `e449084` | `docs/report/A7.md` | Di-merge 2026-09-27 (Claude, sweep pra-G1: STATUS.md sudah ✅ tapi kode belum ter-merge). Verified: go build/vet/test 59 lulus, tsc 0 error, eslint 0 error (7 warning), next build hijau. `map[string]interface{}` di admin_handler/admin_repo pre-existing dari A4, A7 tidak menyentuhnya. |
| B1 | Buku alamat | ✅ | B | 2026-09-26 | `ec/B1-buku-alamat` (direwrite, lihat `9b51245`) | `9b51245` | `docs/report/B1.md` | **Direview ulang & di-merge 2026-09-26** (Claude, audit §4 langkah 5): tidak ada pelanggaran kepemilikan, tapi 2 penyimpangan kontrak diperbaiki saat merge — `api.ts` diarahkan ke `request()` dari `lib/http.ts` (sebelumnya custom fetch+supabase), dan `AddressPicker` dikembalikan ke signature beku §5.3 (`value`/`onChange`, sebelumnya diubah jadi `selectedId`/`onSelect`). Verified: go build/vet/test 29 lulus, tsc 0 error, eslint 0 error, next build hijau. |
| B2 | Keranjang relasional | ✅ | B | 2026-09-26 | `ec/B2-keranjang-relasional` | `0ddaaa5` | `docs/report/B2.md` | **Diperbaiki & di-merge 2026-09-26** (Claude): Memperbaiki pelanggaran kepemilikan core pada halaman auth dan `product-detail-view.tsx`. Penyesuaian `cart-store.ts` agar pemanggilan `syncFromServer` otomatis melakukan `mergeWithServer` tanpa perlu merubah logika halaman auth inti. |
| B3 | Wishlist | ✅ | B | 2026-09-26 | `ec/B3-wishlist` | `d01c5d2` | `docs/report/B3.md` | |
| B4 | Ongkir tabel | ✅ | B | 2026-09-27 | `ec/B4-ongkir-tabel` | `0a0a500` | `docs/report/B4.md` | Selesai |
| B5 | Lanjut bayar | ✅ | B | 2026-09-27 | `ec/B5-lanjut-bayar` | `28bd589` | `docs/report/B5.md` | Diperbaiki saat merge: response dibungkus httpx.Response, math/rand diganti crypto/rand |
| B6 | Admin pelanggan & pengaturan | ✅ | B | 2026-09-27 | `ec/B6-admin-pelanggan-pengaturan` | `f3bb10c` | `docs/report/B6.md` | Di-merge 2026-09-27. Diperbaiki: map[string]interface{} di UpdateSettings diganti typed struct |
| B7 | E2E customer | ✅ | B | 2026-09-27 | `ec/B7-e2e-customer` | `9cf3b9a` | `docs/report/B7.md` | Di-merge 2026-09-27 (Claude, sweep pra-G1: STATUS.md sudah ✅ tapi kode belum ter-merge — report sempat ditulis langsung ke main tanpa branch-nya). Verified: go build/vet/test 66 lulus, tsc 0 error, eslint 0 error (5 warning), next build hijau. |
| C1 | Kupon admin | ✅ | C | 2026-09-26 | `ec/C1-kupon-admin` (direwrite, lihat `efc06d3`) | `efc06d3` | `docs/report/C1.md` | **Direview ulang & di-merge 2026-09-26** (Claude, audit §4 langkah 5): kode asli C1 (`d1c4079`) menaruh fungsi/tipe kupon di barrel core (`lib/api.ts`/`types.ts`/`admin-queries.ts`) karena worktree-nya predates 0C's real merge ke main. Dipindah ke `lib/promo/{api,types,queries}.ts`, endpoint Go (`internal/promo/**`) tidak berubah (sudah benar dari awal). Dua perubahan lain di commit asli (anotasi tipe di `search/page.tsx`/`product-detail-view.tsx`, di luar domain C) tidak diikutsertakan — tsc sudah bersih tanpanya. Verified: go build/vet/test 29 lulus, tsc 0 error, eslint 0 error, next build hijau. |
| C2 | Mesin diskon | ✅ | C | 2026-09-26 | `ec/C2-mesin-diskon` | `141ec35` | `docs/report/C2.md` | |
| C3 | Validasi kupon & promo publik | ✅ | C | 2026-09-27 | `ec/C3-validasi-kupon-publik` | `424087c` | `docs/report/C3.md` | |
| C4 | Laporan | ✅ | C | 2026-09-27 | `ec/C4-laporan` | `ed1313e` | `docs/report/C4.md` | |
| C5 | Dashboard v2 | ✅ | C | 2026-09-27 | `ec/C5-dashboard-v2` | `eb4f21c` | `docs/report/C5.md` | |
| C6 | E2E promo | ✅ | C | 2026-09-27 | `ec/C6-e2e-promo` | `df014b3` | `docs/report/C6.md` | Di-merge 2026-09-27 (Claude, verifikasi ulang): go build/vet/test 22 lulus (promo), tsc e2e 0 error, check-ownership.sh & any-check.sh bersih. Diperbaiki: `stats_repo.go` kolom `customer_email` tak ada di tabel `orders`, diganti `'' AS customer_email` (sebelumnya `GET /admin/stats` selalu 500). |
| D1 | Riwayat pesanan v2 | ✅ | D | 2026-09-26 | `ec/D1-riwayat-pesanan-v2` (direwrite, lihat `c35e353`) | `c35e353` | `docs/report/D1.md` | **Direview ulang & di-merge 2026-09-26** (Claude, audit §4 langkah 5): kode asli D1 (`5ffb503`) menaruh tipe/fungsi/hook order di barrel core lama (`lib/api.ts`/`types.ts`/`queries.ts`/`fixtures/index.ts`) dan file baru `components/kriya/order-status-badge.tsx` (bukan stub `aftersales/order-status-badge.tsx`) karena worktree-nya predates 0C's real merge. Dipindah ke `lib/aftersales/{api,types,queries,fixtures}.ts` dan stub asli diisi. Key i18n direname dari prefix `orders.*` (salah, R11) ke `after.*`/`after.orders.*` sesuai kontrak §5.4. `middleware.ts` baru dari commit asli TIDAK diikutsertakan — guard login untuk `/orders` dkk sudah ada & lebih lengkap di `proxy.ts` (Next 16 real convention, sudah termasuk 0C). Backend `internal/aftersales/**` tidak berubah (sudah benar sejak awal). Verified: go build/vet/test 29 lulus, tsc 0 error, eslint 0 error (21 warning, turun dari 22 karena stub badge terisi), next build hijau. |
| D2 | Event, catatan, resi | ✅ | D | 2026-09-26 | `ec/D2-event-catatan-resi` | `80b1944` | `docs/report/D2.md` | |
| D3 | Batal oleh customer | ✅ | D | 2026-09-27 | `ec/D3-batal-oleh-customer` | `04a715f` | `docs/report/D3.md` | **Diperbaiki 2026-09-27 (Claude, setelah merge I-BE)**: `dummyPorts := checkout.Ports{}` (no-op) di `order_handler.go`/`admin_handler.go`/`routes.go` diganti `deps.Ports` asli (sekarang tersedia); fallback silent-override saat `orderflow.Transition` gagal dihapus, error dipetakan ke 409 (`InvalidTransitionError`/`MissingShipmentInfoError`); `CancelOrder` sekarang juga memanggil `midtrans.CancelTransaction` best-effort. Lihat `docs/state/2026-09-27-claude-wire-ports-aftersales.md`. |
| D4 | Ulasan | ✅ | D | 2026-09-27 | `ec/D4-ulasan` | `7124123` | `docs/report/D4.md` | |
| D5 | Retur & refund | ✅ | D | 2026-09-27 | `ec/D5-retur-refund` | `a896fea` | `docs/report/D5.md` | Diperbaiki saat merge: map[string]interface{} diganti typed struct, map[string]string response diganti named type |
| D6 | Notifikasi & invoice | ✅ | D | 2026-09-27 | `ec/D6-notifikasi-invoice` | `3a219fe` | `docs/report/D6.md` | Di-merge 2026-09-27. Diperbaiki: map[string]interface{} di UpdateOrderStatus diganti typed struct |
| D7 | E2E aftersales | ✅ | D | 2026-09-27 | `ec/D7-e2e-aftersales` | `a115645` | `docs/report/D7.md` | Di-merge 2026-09-27 (Claude, sweep pra-G1: STATUS.md sudah ✅ tapi kode belum ter-merge). Verified: go build/vet/test 66 lulus, tsc 0 error, eslint 0 error (6 warning), next build hijau. |

## F2 — Integrasi checkout (menunggu G1)

| ID | Task | Status | Agent | Tgl klaim | Branch | Commit | Report | Catatan |
|---|---|---|---|---|---|---|---|---|
| I-BE | Checkout v2 backend | ✅ | I-BE | 2026-09-27 | `ec/I-BE-checkout-v2` | `5cf6808` | `docs/report/I-BE.md` | Quote & webhook v2 diverifikasi penuh lewat curl ke DB dev (settlement, idempotensi, transisi tidak valid diserap aman, 404, signature salah — semua benar). `POST /orders` diverifikasi sampai tepat sebelum `Inventory.Reserve`: **diblokir bug pra-ada di `internal/catalog/ledger.go`+`admin_repo.go`** (5 titik `.Clauses(gorm.Expr("FOR UPDATE"))` — bukan clause GORM valid, selalu `SQLSTATE 42601`; fix sama seperti yang diterapkan I-BE di `pricing.go`). **Diperbaiki 2026-09-27 di `main` sebelum merge ini (Claude)**: 5 titik di `catalog/ledger.go`+`admin_repo.go` diganti `clause.Locking{Strength: "UPDATE"}` (lihat baris A5 & `docs/state/2026-09-27-claude-fix-forupdate-catalog.md`); `checkout/pricing.go:48` (join, perlu `Table: clause.Table{Name: "pv"}`) sudah diperbaiki I-BE sendiri di branch ini. Ditemukan & diperbaiki I-BE juga: `orderflow.CanTransition` tidak cocok tabel §6.1, `orderflow.Transition` (stub sejak 0B) diimplementasikan, import cycle checkout↔orderflow diselesaikan (orderflow jadi alias), `platform.Deps.Ports` ditambah (diminta D2/D3/D5). |
| I-FE | Checkout v2 frontend | ✅ | I-FE | 2026-09-27 | `ec/I-FE-checkout-v2` | `919b659` | `docs/report/I-FE.md` | Dikembangkan via fixtures (I-BE belum ada implementasi saat ditutup). tsc/eslint/next build hijau. E2E `transaksi.spec.ts` ditulis ulang tapi tidak bisa diverifikasi hijau di sandbox ini (webServer Playwright gagal start untuk semua spec, termasuk yang tidak diubah — lihat LOG-I.md). I-BE sudah merge ke `main` di sesi lain sebelum merge ini — FE belum sempat diuji ulang terhadap backend nyata sebelum merge; lihat Next di `docs/report/I-FE.md`. |
| I-QA | E2E flow penuh | 🟦 | I-QA | 2026-09-27 | | | | |

## F3 — Pengerasan (menunggu G2)

| ID | Task | Status | Agent | Tgl klaim | Branch | Commit | Report | Catatan |
|---|---|---|---|---|---|---|---|---|
| F3-A | Seed/audit katalog | ⬜ | | | | | | |
| F3-B | Audit customer | ⬜ | | | | | | |
| F3-C | Seed/audit promo | ⬜ | | | | | | |
| F3-D | Seed/audit after-sales | ⬜ | | | | | | |
| F3-Z | Migrasi 013 + update dokumen (Claude/Satria) | ⬜ | | | | | | |

---

## Riwayat audit dashboard ini

| Tanggal | Oleh | Temuan |
|---|---|---|
| 2026-09-26 | Claude (audit atas permintaan Satria) | 0A tidak dikerjakan sama sekali (tidak ada branch/worktree/commit/file) — dikerjakan hari ini, lihat baris 0A. |
| 2026-09-26 | Claude (verifikasi mendalam 0B/0D, dijalankan bukan cuma dibaca) | **0B**: report asli (`c7ae1f8`, ditulis Satria) ternyata ADA tapi tidak pernah di-push — persis gap yang sama dengan 0A, dipindahkan ke path benar (`docs/report/0B.md`) dan di-push. Go build/vet/test genuinely lulus (29 test). `any-check.sh` gagal saat dijalankan benar: struct `Response` diduplikasi 6x (harus dari `internal/httpx`). **0D**: report ada tapi nama file salah (`REPORT-0D.md`), dipindahkan ke `docs/report/0D.md`. `golden.sh`/`check-ownership.sh`/`any-check.sh` genuinely bekerja dan kredibel (sanity-test negatif terdokumentasi). **`mintjwt` gagal total build** (`go.mod` tidak ada) — klaim "clean tanpa teguran type" di report asli tidak akurat. Kedua temuan (duplikasi Response, mintjwt rusak) dicatat sebagai permintaan lintas-domain, BELUM diperbaiki (keputusan Satria: dokumentasikan dulu). |
| 2026-09-26 | Claude (audit F1 gelombang A1/B1/C1/D1, lihat `docs/ec-v2/AUDIT-F1-A1D1-2026-09-26.md`) | `check-ownership.sh` selalu "lulus" karena bug heredoc/stdin — diperbaiki `a063855`, re-run terhadap A1 menghasilkan 76 pelanggaran nyata (sebelumnya 0). B1 bersih; A1/C1/D1 punya pelanggaran kepemilikan nyata. **Ditemukan lebih dalam saat menindaklanjuti**: baris "0C ✅ merged `194ecfc`" salah — `194ecfc` hanya berisi docs, kode asli 0C (82 file) baru di-merge `b760761` hari ini. Baris "C1 ✅ `4f558b2`" juga salah — commit itu hanya update `LOG-C.md`, kode C1 belum pernah masuk `main`; diturunkan ke 🟥. |
