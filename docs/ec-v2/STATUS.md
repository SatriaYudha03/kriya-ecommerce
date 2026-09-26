# STATUS â€” Dashboard Eksekusi KRIYA E-commerce v2

**Ini SUMBER KEBENARAN TUNGGAL status setiap task program EC-v2.**
Klaim opencode, laporan lisan, atau commit di branch **tidak dihitung** sebagai
"selesai" sampai barisnya di tabel ini berstatus âœ… dan seluruh kolomnya terisi.
Kalau tidak ada baris âœ… di sini â€” **task itu dianggap belum dikerjakan**, titik.

âš ï¸ **File INI SENDIRI juga bisa salah** â€” terbukti 2Ã— (0A, 0B, lihat Riwayat audit
di bawah). Kolom Commit di tabel ini HANYA valid kalau berasal dari
`git log origin/<branch> -1` yang baru dijalankan, bukan disalin dari `git branch -v`
lokal atau dipercaya begitu saja dari isi tabel sebelumnya. Siapa pun yang membaca
âœ… di sini dan akan mengambil keputusan berdasarkan itu (merge, gerbang, lapor ke
Satria) **wajib reverifikasi sendiri** dengan `git fetch` dulu.

Aturan pakai lengkap: `docs/rencana/EKSEKUSI-PARALEL-V2.md` Â§0, R18â€“R20, Â§11.1 (sweep pra-gerbang).

## Legenda

| Simbol | Arti |
|---|---|
| â¬œ | Belum diklaim / belum dikerjakan |
| ðŸŸ¦ | Diklaim, sedang dikerjakan |
| ðŸŸ¥ | Diblokir (lihat kolom Catatan + Permintaan lintas-domain di LOG) |
| âœ… | Selesai â€” DoD Â§2.2 hijau, report ditulis, di-push |

## Cara update (WAJIB, lihat R18)

1. **Sebelum mulai task:** ubah barisnya jadi ðŸŸ¦, isi kolom Agent + Tanggal klaim, commit **hanya file ini** dengan pesan `[ec-status] klaim <ID>`, push, baru mulai kerja.
2. **Sebelum menutup sesi:** ubah jadi âœ… (atau ðŸŸ¥ bila diblokir total), isi Branch, Commit SHA (7 karakter), link Report, commit `[ec-status] tutup <ID>`, push.
3. Klaim (ðŸŸ¦) yang tidak bergerak > 1 sesi boleh diambil ulang agent lain â€” catat serah-terima di kolom Catatan.
4. Reviewer (Claude) mengecek baris ini **sebelum** review branch mana pun (lihat EKSEKUSI-PARALEL-V2.md Â§11 langkah 0).

---

## Gerbang

| Gerbang | Status | Tanggal | Catatan |
|---|---|---|---|
| G0 (fondasi â†’ domain) | âœ… | 2026-09-26 | Migrasi selesai, tag ec-v2-g0 |
| G1 (domain â†’ integrasi) | â¬œ | | |
| G2 (integrasi â†’ pengerasan) | â¬œ | | |
| G3 (rilis) | â¬œ | | |

## F0 â€” Fondasi

| ID | Task | Status | Agent | Tgl klaim | Branch | Commit | Report | Catatan |
|---|---|---|---|---|---|---|---|---|
| 0D-1 | Golden snapshot | âœ… | 0D | 2026-09-24 | `ec/0D-1-golden-snapshot` | `ea105ba` | â€” | Belum ada file report formal terpisah; terverifikasi lewat LOG-0D + report 0D (sanity-test negatif terdokumentasi, kredibel) |
| 0D | Tooling baseline QA | âœ… | 0D | 2026-09-24 | `ec/0D-tooling` / fix di `main` | `6c05995` | `docs/report/0D.md` | **Diverifikasi 2026-09-26**: golden.sh/check-ownership.sh/any-check.sh genuinely lulus & kredibel. `mintjwt` sempat GAGAL TOTAL build (`go.mod` tidak ada) â€” **diperbaiki 2026-09-26** (Claude): `go.mod` terpisah ditambahkan, import diselaraskan ke `jwt/v5`, `go build .`/`go vet .` lulus. |
| 0B | Restrukturisasi Go | âœ… | 0B | 2026-09-24 | `ec/0B-go-refactor` / fix di `main` | `d6257b3` | `docs/report/0B.md` | **Diverifikasi 2026-09-26**: go build/vet/test lulus (29 test), check-ownership lulus. Duplikasi `Response`/`Meta`/`ErrorDetail`/`ErrorResponse` 6x â€” **diperbaiki 2026-09-26** (Claude): semua import dari `internal/httpx`; sekalian dibersihkan >200 baris scaffolding katalog/checkout yang salah tempel & tidak dipakai di `promo`/`aftersales`. `go build/vet/test` tetap hijau. Sisa `gin.H`/`interface{}` lain di `any-check.sh` terbukti pre-existing dari `main`, belum diperbaiki (di luar scope). |
| 0C | Restrukturisasi FE | âœ… | 0C | 2026-09-24 | `ec/0C-fe-refactor-2` (merged ke main) | `0186854` | `docs/report/0C.md` | **Diperbaiki 2026-09-26** (Claude): `194ecfc` yang diklaim sebagai commit merge ternyata HANYA berisi docs/report+LOG â€” kode asli (82 file, ~3160 baris: `lib/http.ts`, `lib/<domain>/**`, `lib/checkout/**`, `lib/snap.ts`, `proxy.ts`, split i18n, 17 primitive shadcn) baru benar-benar di-merge ke `main` di `b760761`. tsc/eslint/next-build/go-build-vet-test semua hijau setelah merge + `pnpm install` (paket `cn` dari lockfile 0C). Ini akar penyebab sebagian besar "pelanggaran core" yang ditemukan audit F1 A1/C1/D1 â€” worktree mereka sudah punya baseline F0 yang benar, `main` yang belum. |
| **0A** | **Migrasi SQL 008â€“012** | âœ… | 0A (Claude) | 2026-09-26 | `ec/0A-sql-migrations` | `389cd2e` | `docs/report/0A.md` | Diuji lokal (Supabase CLI+Docker): clean apply, backfill, idempotensi 2x, CHECK constraint, fungsi harga sale â€” semua lulus. Belum diterapkan ke DB dev (tugas G0). Lihat âš  verifikasi wajib di report sebelum G0. |

## F1 â€” Domain (paralel penuh, menunggu G0)

| ID | Task | Status | Agent | Tgl klaim | Branch | Commit | Report | Catatan |
|---|---|---|---|---|---|---|---|---|
| A1 | Status produk & arsip | âœ… | A | 2026-09-26 | `ec/A1-status-produk-arsip` | `e82e21d` | `docs/report/A1.md` | |
| A2 | Harga sale terjadwal | âœ… | A | 2026-09-26 | ec/A2-harga-sale-terjadwal | e161ddf | docs/report/A2.md | |
| A3 | Kategori bertingkat | âœ… | A | 2026-09-26 | `ec/A3-kategori-bertingkat` | `60db1c4` | `docs/report/A3.md` | |
| A4 | Tag, atribut & facet | â¬œ | | | | | | |
| A5 | Ledger stok | â¬œ | | | | | | |
| A6 | Produk terkait & rating | â¬œ | | | | | | |
| A7 | Seed & E2E katalog | â¬œ | | | | | | |
| B1 | Buku alamat | âœ… | B | 2026-09-26 | `ec/B1-buku-alamat` (direwrite, lihat `9b51245`) | `9b51245` | `docs/report/B1.md` | **Direview ulang & di-merge 2026-09-26** (Claude, audit Â§4 langkah 5): tidak ada pelanggaran kepemilikan, tapi 2 penyimpangan kontrak diperbaiki saat merge â€” `api.ts` diarahkan ke `request()` dari `lib/http.ts` (sebelumnya custom fetch+supabase), dan `AddressPicker` dikembalikan ke signature beku Â§5.3 (`value`/`onChange`, sebelumnya diubah jadi `selectedId`/`onSelect`). Verified: go build/vet/test 29 lulus, tsc 0 error, eslint 0 error, next build hijau. |
| B2 | Keranjang relasional | âœ… | B | 2026-09-26 | `ec/B2-keranjang-relasional` | `0ddaaa5` | `docs/report/B2.md` | **Diperbaiki & di-merge 2026-09-26** (Claude): Memperbaiki pelanggaran kepemilikan core pada halaman auth dan `product-detail-view.tsx`. Penyesuaian `cart-store.ts` agar pemanggilan `syncFromServer` otomatis melakukan `mergeWithServer` tanpa perlu merubah logika halaman auth inti. |
| B3 | Wishlist | âœ… | B | 2026-09-26 | `ec/B3-wishlist` | `d01c5d2` | `docs/report/B3.md` | |
| B4 | Ongkir tabel | â¬œ | | | | | | |
| B5 | Lanjut bayar | â¬œ | | | | | | |
| B6 | Admin pelanggan & pengaturan | â¬œ | | | | | | |
| B7 | E2E customer | â¬œ | | | | | | |
| C1 | Kupon admin | âœ… | C | 2026-09-26 | `ec/C1-kupon-admin` (direwrite, lihat `efc06d3`) | `efc06d3` | `docs/report/C1.md` | **Direview ulang & di-merge 2026-09-26** (Claude, audit Â§4 langkah 5): kode asli C1 (`d1c4079`) menaruh fungsi/tipe kupon di barrel core (`lib/api.ts`/`types.ts`/`admin-queries.ts`) karena worktree-nya predates 0C's real merge ke main. Dipindah ke `lib/promo/{api,types,queries}.ts`, endpoint Go (`internal/promo/**`) tidak berubah (sudah benar dari awal). Dua perubahan lain di commit asli (anotasi tipe di `search/page.tsx`/`product-detail-view.tsx`, di luar domain C) tidak diikutsertakan â€” tsc sudah bersih tanpanya. Verified: go build/vet/test 29 lulus, tsc 0 error, eslint 0 error, next build hijau. |
| C2 | Mesin diskon | âœ… | C | 2026-09-26 | `ec/C2-mesin-diskon` | `141ec35` | `docs/report/C2.md` | |
| C3 | Validasi kupon & promo publik | âœ… | C | 2026-09-26 | `ec/C3-validasi-kupon-publik` | `424087c` | `docs/report/C3.md` | |
| C4 | Laporan | ✅ | C | 2026-09-27 | `ec/C4-laporan` | `ed1313e` | `docs/report/C4.md` | |
| C5 | Dashboard v2 | â¬œ | | | | | | |
| C6 | E2E promo | â¬œ | | | | | | |
| D1 | Riwayat pesanan v2 | âœ… | D | 2026-09-26 | `ec/D1-riwayat-pesanan-v2` (direwrite, lihat `c35e353`) | `c35e353` | `docs/report/D1.md` | **Direview ulang & di-merge 2026-09-26** (Claude, audit Â§4 langkah 5): kode asli D1 (`5ffb503`) menaruh tipe/fungsi/hook order di barrel core lama (`lib/api.ts`/`types.ts`/`queries.ts`/`fixtures/index.ts`) dan file baru `components/kriya/order-status-badge.tsx` (bukan stub `aftersales/order-status-badge.tsx`) karena worktree-nya predates 0C's real merge. Dipindah ke `lib/aftersales/{api,types,queries,fixtures}.ts` dan stub asli diisi. Key i18n direname dari prefix `orders.*` (salah, R11) ke `after.*`/`after.orders.*` sesuai kontrak Â§5.4. `middleware.ts` baru dari commit asli TIDAK diikutsertakan â€” guard login untuk `/orders` dkk sudah ada & lebih lengkap di `proxy.ts` (Next 16 real convention, sudah termasuk 0C). Backend `internal/aftersales/**` tidak berubah (sudah benar sejak awal). Verified: go build/vet/test 29 lulus, tsc 0 error, eslint 0 error (21 warning, turun dari 22 karena stub badge terisi), next build hijau. |
| D2 | Event, catatan, resi | âœ… | D | 2026-09-26 | `ec/D2-event-catatan-resi` | `80b1944` | `docs/report/D2.md` | |
| D3 | Batal oleh customer | âœ… | D | 2026-09-27 | `ec/D3-batal-oleh-customer` | `04a715f` | `docs/report/D3.md` | |
| D4 | Ulasan | â¬œ | | | | | | |
| D5 | Retur & refund | â¬œ | | | | | | |
| D6 | Notifikasi & invoice | â¬œ | | | | | | |
| D7 | E2E aftersales | â¬œ | | | | | | |

## F2 â€” Integrasi checkout (menunggu G1)

| ID | Task | Status | Agent | Tgl klaim | Branch | Commit | Report | Catatan |
|---|---|---|---|---|---|---|---|---|
| I-BE | Checkout v2 backend | â¬œ | | | | | | |
| I-FE | Checkout v2 frontend | â¬œ | | | | | | |
| I-QA | E2E flow penuh | â¬œ | | | | | | |

## F3 â€” Pengerasan (menunggu G2)

| ID | Task | Status | Agent | Tgl klaim | Branch | Commit | Report | Catatan |
|---|---|---|---|---|---|---|---|---|
| F3-A | Seed/audit katalog | â¬œ | | | | | | |
| F3-B | Audit customer | â¬œ | | | | | | |
| F3-C | Seed/audit promo | â¬œ | | | | | | |
| F3-D | Seed/audit after-sales | â¬œ | | | | | | |
| F3-Z | Migrasi 013 + update dokumen (Claude/Satria) | â¬œ | | | | | | |

---

## Riwayat audit dashboard ini

| Tanggal | Oleh | Temuan |
|---|---|---|
| 2026-09-26 | Claude (audit atas permintaan Satria) | 0A tidak dikerjakan sama sekali (tidak ada branch/worktree/commit/file) â€” dikerjakan hari ini, lihat baris 0A. |
| 2026-09-26 | Claude (verifikasi mendalam 0B/0D, dijalankan bukan cuma dibaca) | **0B**: report asli (`c7ae1f8`, ditulis Satria) ternyata ADA tapi tidak pernah di-push â€” persis gap yang sama dengan 0A, dipindahkan ke path benar (`docs/report/0B.md`) dan di-push. Go build/vet/test genuinely lulus (29 test). `any-check.sh` gagal saat dijalankan benar: struct `Response` diduplikasi 6x (harus dari `internal/httpx`). **0D**: report ada tapi nama file salah (`REPORT-0D.md`), dipindahkan ke `docs/report/0D.md`. `golden.sh`/`check-ownership.sh`/`any-check.sh` genuinely bekerja dan kredibel (sanity-test negatif terdokumentasi). **`mintjwt` gagal total build** (`go.mod` tidak ada) â€” klaim "clean tanpa teguran type" di report asli tidak akurat. Kedua temuan (duplikasi Response, mintjwt rusak) dicatat sebagai permintaan lintas-domain, BELUM diperbaiki (keputusan Satria: dokumentasikan dulu). |
| 2026-09-26 | Claude (audit F1 gelombang A1/B1/C1/D1, lihat `docs/ec-v2/AUDIT-F1-A1D1-2026-09-26.md`) | `check-ownership.sh` selalu "lulus" karena bug heredoc/stdin â€” diperbaiki `a063855`, re-run terhadap A1 menghasilkan 76 pelanggaran nyata (sebelumnya 0). B1 bersih; A1/C1/D1 punya pelanggaran kepemilikan nyata. **Ditemukan lebih dalam saat menindaklanjuti**: baris "0C âœ… merged `194ecfc`" salah â€” `194ecfc` hanya berisi docs, kode asli 0C (82 file) baru di-merge `b760761` hari ini. Baris "C1 âœ… `4f558b2`" juga salah â€” commit itu hanya update `LOG-C.md`, kode C1 belum pernah masuk `main`; diturunkan ke ðŸŸ¥. |
