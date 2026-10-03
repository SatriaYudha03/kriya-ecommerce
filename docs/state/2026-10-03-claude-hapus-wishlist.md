# 2026-10-03 — Hapus total fitur wishlist (permintaan Satria)

- FE: hapus /account/wishlist, WishlistButton, WishlistNavButton, hook/api/type/i18n wishlist, link di account-nav, header, product-card, product-detail.
- BE: hapus wishlist_{handler,models,repo}.go + route GET/PUT/DELETE /wishlist.
- DB: migrasi baru supabase/migrations/015_drop_wishlist.sql (DROP TABLE wishlist_items) — BELUM diterapkan ke DB live. Seed wishlist dihapus dari services/api/db/seed.sql.
- e2e: test wishlist dihapus dari e2e/ec-customer.spec.ts.
- Dokumen rencana/kontrak lama (KRIYA-MASTER Bagian 6, AGENT-*, docs/rencana, docs/report) masih menyebut wishlist — belum diedit; perlu update kontrak terpisah.
- Verifikasi: go build ./... OK, tsc --noEmit OK.
