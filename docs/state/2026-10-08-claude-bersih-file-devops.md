# 2026-10-08 — Bersih-bersih file usang + hapus infrastruktur DevOps

Peran: Claude (maintenance, atas permintaan Satria). Belum di-commit.

## Dihapus
- DevOps (akan dibangun ulang dari nol oleh Satria sambil belajar):
  `.github/workflows/{ci,cd}.yml`, `helm/` (chart kriya + monitoring + values-*),
  `infra/` (terraform, k3s-bootstrap, letsencrypt issuer), `apps/web/Dockerfile`,
  `services/api/Dockerfile`, `services/api/.dockerignore`.
- Skrip scratch di root: `check_admin.go`, `check_eca*.go`, `test_db.go`,
  `update_admin_pw.go` (berisi password admin hardcoded), `fix_products*.sql` (untracked, data placeholder).
- `e2e/ai-search.spec.ts` — menguji rute `/produk/` + "produk serupa" (fitur vektor yang sudah di-pivot).
- Artefak build/tes yang di-ignore: `services/api/*.exe`, `e2e/playwright-report`, `e2e/test-results`.

## Diubah
- `docker-compose.yml`: service `api` (build Dockerfile) dibuang; compose kini hanya n8n + llm-proxy untuk dev lokal (dev.ps1 tetap jalan).
- `README.md` §5: cara menjalankan backend disesuaikan.

## Sengaja DIPERTAHANKAN
- Rencana DevOps: `docs/devops/*`, `docs/agents/AGENT-DEVSECOPS.md`, `docs/rencana/*`.
  Catatan: `docs/devops/devops-architecture.md` masih menyebut FastAPI (sudah di-pivot) — perbarui saat menyusun ulang.
- Dokumen/skrip EC-v2 (`docs/ec-v2`, `docs/report`, `scripts/ec-v2`) — program belum lewat G2/G3.
- Pekerjaan berjalan yang belum di-commit (KB chatbot, migrasi 014, `services/api/db/seed.sql`, dll).
