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
| G1 (domain → integrasi) | ⬜ | | |
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
| A4 | Tag, atribut & facet | ⬜ | | | | | | |
| A5 | Ledger stok | ⬜ | | | | | | |
| A6 | Produk terkait & rating | ⬜ | | | | | | |
| A7 | Seed & E2E katalog | ⬜ | | | | | | |
| B1 | Buku alamat | ✅ | B | 2026-09-26 | `ec/B1-buku-alamat` (direwrite, lihat `9b51245`) | `9b51245` | `docs/report/B1.md` | **Direview ulang & di-merge 2026-09-26** (Claude, audit §4 langkah 5): tidak ada pelanggaran kepemilikan, tapi 2 penyimpangan kontrak diperbaiki saat merge — `api.ts` diarahkan ke `request()` dari `lib/http.ts` (sebelumnya custom fetch+supabase), dan `AddressPicker` dikembalikan ke signature beku §5.3 (`value`/`onChange`, sebelumnya diubah jadi `selectedId`/`onSelect`). Verified: go build/vet/test 29 lulus, tsc 0 error, eslint 0 error, next build hijau. |
| B2 | Keranjang relasional | ✅ | B | 2026-09-26 | `ec/B2-keranjang-relasional` | `0ddaaa5` | `docs/report/B2.md` | **Diperbaiki & di-merge 2026-09-26** (Claude): Memperbaiki pelanggaran kepemilikan core pada halaman auth dan `product-detail-view.tsx`. Penyesuaian `cart-store.ts` agar pemanggilan `syncFromServer` otomatis melakukan `mergeWithServer` tanpa perlu merubah logika halaman auth inti. |
| B3 | Wishlist | ✅ | B | 2026-09-26 | `ec/B3-wishlist` | `d01c5d2` | `docs/report/B3.md` | |
| B4 | Ongkir tabel | ⬜ | | | | | | |
| B5 | Lanjut bayar | ⬜ | | | | | | |
| B6 | Admin pelanggan & pengaturan | ⬜ | | | | | | |
| B7 | E2E customer | ⬜ | | | | | | |
| C1 | Kupon admin | ✅ | C | 2026-09-26 | `ec/C1-kupon-admin` (direwrite, lihat `efc06d3`) | `efc06d3` | `docs/report/C1.md` | **Direview ulang & di-merge 2026-09-26** (Claude, audit §4 langkah 5): kode asli C1 (`d1c4079`) menaruh fungsi/tipe kupon di barrel core (`lib/api.ts`/`types.ts`/`admin-queries.ts`) karena worktree-nya predates 0C's real merge ke main. Dipindah ke `lib/promo/{api,types,queries}.ts`, endpoint Go (`internal/promo/**`) tidak berubah (sudah benar dari awal). Dua perubahan lain di commit asli (anotasi tipe di `search/page.tsx`/`product-detail-view.tsx`, di luar domain C) tidak diikutsertakan — tsc sudah bersih tanpanya. Verified: go build/vet/test 29 lulus, tsc 0 error, eslint 0 error, next build hijau. |
| C2 | Mesin diskon | ✅ | C | 2026-09-26 | `ec/C2-mesin-diskon` | `141ec35` | `docs/report/C2.md` | |
| C3 | Validasi kupon & promo publik | ⬜ | | | | | | |
| C4 | Laporan | ⬜ | | | | | | |
| C5 | Dashboard v2 | ⬜ | | | | | | |
| C6 | E2E promo | ⬜ | | | | | | |
| D1 | Riwayat pesanan v2 | ✅ | D | 2026-09-26 | `ec/D1-riwayat-pesanan-v2` (direwrite, lihat `c35e353`) | `c35e353` | `docs/report/D1.md` | **Direview ulang & di-merge 2026-09-26** (Claude, audit §4 langkah 5): kode asli D1 (`5ffb503`) menaruh tipe/fungsi/hook order di barrel core lama (`lib/api.ts`/`types.ts`/`queries.ts`/`fixtures/index.ts`) dan file baru `components/kriya/order-status-badge.tsx` (bukan stub `aftersales/order-status-badge.tsx`) karena worktree-nya predates 0C's real merge. Dipindah ke `lib/aftersales/{api,types,queries,fixtures}.ts` dan stub asli diisi. Key i18n direname dari prefix `orders.*` (salah, R11) ke `after.*`/`after.orders.*` sesuai kontrak §5.4. `middleware.ts` baru dari commit asli TIDAK diikutsertakan — guard login untuk `/orders` dkk sudah ada & lebih lengkap di `proxy.ts` (Next 16 real convention, sudah termasuk 0C). Backend `internal/aftersales/**` tidak berubah (sudah benar sejak awal). Verified: go build/vet/test 29 lulus, tsc 0 error, eslint 0 error (21 warning, turun dari 22 karena stub badge terisi), next build hijau. |
| D2 | Event, catatan, resi | ✅ | D | 2026-09-26 | `ec/D2-event-catatan-resi` | `80b1944` | `docs/report/D2.md` | |
| D3 | Batal oleh customer | ⬜ | | | | | | |
| D4 | Ulasan | ⬜ | | | | | | |
| D5 | Retur & refund | ⬜ | | | | | | |
| D6 | Notifikasi & invoice | ⬜ | | | | | | |
| D7 | E2E aftersales | ⬜ | | | | | | |

## F2 — Integrasi checkout (menunggu G1)

| ID | Task | Status | Agent | Tgl klaim | Branch | Commit | Report | Catatan |
|---|---|---|---|---|---|---|---|---|
| I-BE | Checkout v2 backend | ⬜ | | | | | | |
| I-FE | Checkout v2 frontend | ⬜ | | | | | | |
| I-QA | E2E flow penuh | ⬜ | | | | | | |

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
