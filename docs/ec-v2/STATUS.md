# STATUS — Dashboard Eksekusi KRIYA E-commerce v2

**Ini SUMBER KEBENARAN TUNGGAL status setiap task program EC-v2.**
Klaim opencode, laporan lisan, atau commit di branch **tidak dihitung** sebagai
"selesai" sampai barisnya di tabel ini berstatus ✅ dan seluruh kolomnya terisi.
Kalau tidak ada baris ✅ di sini — **task itu dianggap belum dikerjakan**, titik.

Aturan pakai lengkap: `docs/rencana/EKSEKUSI-PARALEL-V2.md` §0 dan R18.

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
| G0 (fondasi → domain) | ⬜ | | Menunggu 0A + review 0B/0C/0D |
| G1 (domain → integrasi) | ⬜ | | |
| G2 (integrasi → pengerasan) | ⬜ | | |
| G3 (rilis) | ⬜ | | |

## F0 — Fondasi

| ID | Task | Status | Agent | Tgl klaim | Branch | Commit | Report | Catatan |
|---|---|---|---|---|---|---|---|---|
| 0D-1 | Golden snapshot | ✅ | 0D | 2026-09-24 | `ec/0D-1-golden-snapshot` | `ea105ba` | — | Belum ada file report formal; log ada di `docs/ec-v2/LOG-0D.md` |
| 0D | Tooling baseline QA | ✅ | 0D | 2026-09-24 | `ec/0D-tooling` | `ef9527d` | `docs/report/0D.md`? | ⚠️ **Perlu verifikasi**: report belum ditemukan saat audit 2026-09-26 |
| 0B | Restrukturisasi Go | ✅ | 0B | 2026-09-24 | `ec/0B-go-refactor` | `c7ae1f8` | `docs/report/0B.md`? | ⚠️ **Perlu verifikasi**: report belum ditemukan saat audit 2026-09-26 |
| 0C | Restrukturisasi FE | ✅ | 0C | 2026-09-24 | `ec/0C-fe-refactor-2` (merged ke main) | `0186854` | `docs/report/0C.md` | Merged ke `main` di `194ecfc` |
| **0A** | **Migrasi SQL 008–012** | 🟦 | 0A (Claude) | 2026-09-26 | `ec/0A-sql-migrations` | — | — | Diklaim 2026-09-26 setelah audit menemukan task ini tidak pernah dikerjakan. |

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
| 2026-09-26 | Claude (audit atas permintaan Satria) | 0A tidak dikerjakan sama sekali (tidak ada branch/worktree/commit/file). 0B/0D mengaku selesai lewat commit tapi file report `docs/report/0B.md` dan `docs/report/0D.md` **tidak ditemukan** di repo — hanya `docs/report/0C.md` yang ada. Dashboard ini dibuat karena sebelumnya tidak ada cara cepat memverifikasi ini tanpa menggali git log manual. |
