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
| 0D | Tooling baseline QA | 🟥 | 0D | 2026-09-24 | `ec/0D-tooling` | `6c05995` | `docs/report/0D.md` | **Diverifikasi 2026-09-26**: golden.sh/check-ownership.sh/any-check.sh genuinely lulus & kredibel. **`mintjwt` GAGAL TOTAL build** (`go.mod` tidak ada) — blocking untuk F1. Report awal (`REPORT-0D.md`, salah nama) tidak pernah menyebut kegagalan ini. Diputuskan Satria: dicatat, belum diperbaiki. |
| 0B | Restrukturisasi Go | 🟥 | 0B | 2026-09-24 | `ec/0B-go-refactor` | `d6257b3` | `docs/report/0B.md` | **Diverifikasi 2026-09-26**: go build/vet/test lulus (29 test), check-ownership lulus. Report awal (`c7ae1f8`, ditulis Satria 2026-09-24) **tidak pernah di-push** — sama seperti gap 0A, sudah diperbaiki. `any-check.sh` gagal: struct `Response` diduplikasi 6x alih-alih import dari `internal/httpx` (melanggar kontrak §4.2), sebagian besar `interface{}`/`gin.H` lain terbukti pre-existing dari `main`. Diputuskan Satria: dicatat, belum diperbaiki. |
| 0C | Restrukturisasi FE | ✅ | 0C | 2026-09-24 | `ec/0C-fe-refactor-2` (merged ke main) | `0186854` | `docs/report/0C.md` | Merged ke `main` di `194ecfc` |
| **0A** | **Migrasi SQL 008–012** | ✅ | 0A (Claude) | 2026-09-26 | `ec/0A-sql-migrations` | `389cd2e` | `docs/report/0A.md` | Diuji lokal (Supabase CLI+Docker): clean apply, backfill, idempotensi 2x, CHECK constraint, fungsi harga sale — semua lulus. Belum diterapkan ke DB dev (tugas G0). Lihat ⚠ verifikasi wajib di report sebelum G0. |

## F1 — Domain (paralel penuh, menunggu G0)

| ID | Task | Status | Agent | Tgl klaim | Branch | Commit | Report | Catatan |
|---|---|---|---|---|---|---|---|---|
| A1 | Status produk & arsip | ⬜ | | | | | | |
| A2 | Harga sale terjadwal | ⬜ | | | | | | |
| A3 | Kategori bertingkat | ⬜ | | | | | | |
| A4 | Tag, atribut & facet | ⬜ | | | | | | |
| A5 | Ledger stok | ⬜ | | | | | | |
| A6 | Produk terkait & rating | ⬜ | | | | | | |
| A7 | Seed & E2E katalog | ⬜ | | | | | | |
| B1 | Buku alamat | ⬜ | | | | | | |
| B2 | Keranjang relasional | ⬜ | | | | | | |
| B3 | Wishlist | ⬜ | | | | | | |
| B4 | Ongkir tabel | ⬜ | | | | | | |
| B5 | Lanjut bayar | ⬜ | | | | | | |
| B6 | Admin pelanggan & pengaturan | ⬜ | | | | | | |
| B7 | E2E customer | ⬜ | | | | | | |
| C1 | Kupon admin | ⬜ | | | | | | |
| C2 | Mesin diskon | ⬜ | | | | | | |
| C3 | Validasi kupon & promo publik | ⬜ | | | | | | |
| C4 | Laporan | ⬜ | | | | | | |
| C5 | Dashboard v2 | ⬜ | | | | | | |
| C6 | E2E promo | ⬜ | | | | | | |
| D1 | Riwayat pesanan v2 | ⬜ | | | | | | |
| D2 | Event, catatan, resi | ⬜ | | | | | | |
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
