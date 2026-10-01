# 2026-10-02 — Admin: fix 500 stats + kurangi latensi

**Bug:** `GET /admin/stats` 500 — `Raw().Scan(stats)` ke `AdminStatsResponse` ditolak GORM
karena field `RecentOrders []RecentOrder` dianggap relasi (regresi dari `ae0e37c`).

**Perubahan (belum di-commit):**
- `promo/stats_repo.go`: scan agregat ke struct lokal; 5 query dijalankan paralel (~1 RTT, bukan 6).
- `middleware/admin.go`: cache status admin di memori 5 menit (hanya hasil "admin"; pencabutan role
  berlaku paling lama 5 menit).
- `cmd/api/main.go`: `GET /api/v1/admin/ping` (probe ringan di balik middleware Admin).
- FE: `AdminGuard` memakai `useAdminAccess` (`/admin/ping`), bukan `useAdminStats`.

**Catatan:** `/admin/ping` belum ada di kontrak KRIYA-MASTER Bagian 6 — perlu didaftarkan.
Sisa latensi = RTT ke Sydney (Fase 4 rencana performa).
