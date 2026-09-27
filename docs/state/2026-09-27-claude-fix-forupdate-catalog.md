**Task**: Perbaiki bug blocking yang ditemukan I-BE (lihat `docs/ec-v2/LOG-I.md` "Permintaan lintas-domain" poin 1, dan `docs/report/I-BE.md`).

**Status**: selesai.

**Fitur/bug diperbaiki**:
- `services/api/internal/catalog/ledger.go:49,137,187` (`InventoryLedger.Reserve/Release/Restock`) dan
  `services/api/internal/catalog/admin_repo.go:55,363` (`UpdateVariantWithLedger`, `AdjustStock`) memakai
  `.Clauses(gorm.Expr("FOR UPDATE"))` — bukan clause GORM valid, selalu menghasilkan SQL rusak
  (`... WHERE id IN (...) AND FOR UPDATE ...` → `SQLSTATE 42601`). Diganti
  `.Clauses(clause.Locking{Strength: "UPDATE"})` (tanpa join, jadi tidak perlu `Table:` alias) di kelima
  titik + import `gorm.io/gorm/clause` ditambah di kedua file.
- Bug sama juga ada di `services/api/internal/checkout/pricing.go:48` (dipakai `PriceLines(lock=true)`),
  tapi **belum diperbaiki di `main`** — sudah diperbaiki I-BE di branch lokal `ec/I-BE-checkout-v2`
  (commit `5cf6808`, belum di-push/merge). Query itu punya `LEFT JOIN categories c`, jadi fix-nya perlu
  `clause.Locking{Strength: "UPDATE", Table: clause.Table{Name: "pv"}}` (bukan bentuk polos), sesuai
  catatan I-BE di LOG-I.md baris 15. Di luar scope sesi ini (task ini fokus pada bug yang memblokir
  `internal/catalog/**`, milik I-BE lintas-teritori); dicatat di sini supaya sesi berikutnya tahu.
- Verifikasi: `go build ./...`, `go vet ./...` bersih; `go test ./...` 66 test lulus (semua paket
  `services/api`). Tidak menambah `interface{}`/`any` baru — sisa lint `interface{}` di `admin_repo.go`
  pre-existing dari A4 (sudah dicatat di STATUS.md).

**Permintaan lintas-teritori**: tidak ada baru. Ini menutup permintaan I-BE (poin 1 di LOG-I.md).

**Next**:
1. Merge branch `ec/I-BE-checkout-v2` (belum di-push) ke `main` — setelah itu ulangi curl `POST /orders`
   I-BE (lihat `docs/report/I-BE.md`) untuk membuktikan alur penuh sampai `snap_token` terbit sekarang
   `Inventory.Reserve` sudah tidak syntax-error.
2. Terapkan fix `clause.Locking{..., Table: clause.Table{Name: "pv"}}` di `checkout/pricing.go:48` saat
   merge branch I-BE (atau langsung di `main` bila merge ditunda), supaya `PriceLines(lock=true)` juga
   benar di `main`.
3. Poin #2 dan #3 di "Permintaan lintas-domain" LOG-I.md (wiring `deps.Ports` di 3 file `aftersales/**`,
   dan fallback `InvalidTransitionError` di `admin_handler.go`) masih terbuka — tanggung jawab merge
   branch I-BE, bukan bagian bug ini.
