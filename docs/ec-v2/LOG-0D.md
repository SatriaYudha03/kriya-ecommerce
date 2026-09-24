# LOG-0D — Baseline QA & perkakas (EKSEKUSI-PARALEL-V2.md §6.4)

## Log

### 2026-09-24 — 0D-1: golden.sh (snapshot JSON semua endpoint GET)

Dikerjakan **sebelum** kode lain di F0 diubah, sesuai urutan §6.0 ("0D-1 dijalankan
pertama di `main` yang belum diubah").

**Dibuat:**
- `scripts/ec-v2/golden.sh capture|diff` — build+jalankan `services/api` dari working
  tree saat ini di port lokal (`GOLDEN_PORT`, default `8097`, tidak bentrok dengan dev
  server `:8080`), mint JWT HS256 customer & admin dari `SUPABASE_JWT_SECRET` (skema
  sama seperti [[local-jwt-testing]]), lalu rekam status+body semua endpoint GET yang
  terdaftar di `cmd/api/main.go` (publik: healthz×2, categories id/en, products id/en,
  product detail id/en · customer: profile, cart, orders list id/en, order detail id/en
  · admin: stats, orders, product detail · internal: order status bila
  `INTERNAL_API_KEY` terisi).
- `scripts/ec-v2/golden_normalize.py` — bungkus `{"http_status","body"}`, normalisasi
  field volatil (`*_at`, `token`/`snap_token`/dll → `"<normalized>"`), lalu diff
  unified antara `scripts/ec-v2/golden/` (baseline, di-commit) dan hasil capture baru.
- `scripts/ec-v2/golden/*.json` — baseline hasil `capture` di `main` (commit
  `5e82474`, sebelum 0A/0B/0C/0D lain menyentuh apa pun).

**Data contoh dipakai (diambil live dari DB dev via `psql "$SUPABASE_DB_URL"`, bukan
hardcode):** produk pertama (`order by created_at asc limit 1`), profil `role='customer'`
pertama + order tertuanya, profil `role='admin'` pertama.

**Hasil uji:**
1. `golden.sh capture` → 17 file di `scripts/ec-v2/golden/`, semua `http_status: 200`.
2. `golden.sh diff` langsung setelahnya (tanpa perubahan kode) → **0 selisih**, exit 0.
3. Sanity check negatif: ubah sementara `internal/handler/health.go` (`"status":"ok"`
   → `"status":"SANITY_TEST_BREAK"`), jalankan `golden.sh diff` → terdeteksi **2 selisih**
   (`healthz-root.json`, `healthz-v1.json`) dengan unified diff yang benar, exit 1.
   Perubahan dikembalikan (`git diff` bersih sebelum commit).

**Bug lingkungan Windows/git-bash yang ditemukan & diperbaiki saat menulis skrip ini**
(dicatat supaya 0A/0B/0C tidak mengulang debugging yang sama):
- `curl` ke `localhost` sesekali gagal dengan `000` (percobaan IPv6 `::1` yang tidak
  responsif) → skrip pakai `127.0.0.1` eksplisit.
- `kill "$pid"` dari bash tidak selalu mematikan biner `.exe` native yang dijalankan
  via `&` di git-bash (PID MSYS ≠ PID Windows yang sebenarnya untuk proses non-MSYS)
  → skrip pakai `taskkill //F //IM golden-api.exe` (nama biner unik untuk skrip ini,
  aman ditarget by-name) baik saat start (bersihkan proses nyasar dari run sebelumnya)
  maupun saat cleanup.
- `psql -tA` di git-bash menyelipkan `\r` di akhir tiap baris output → `read` yang
  tidak di-`tr -d '\r'` dulu menghasilkan URL curl dengan `\r` di tengahnya → curl
  exit 3 ("URL malformed"), persis di request yang memakai ID hasil `psql`. Semua
  pembacaan `psql` di `golden.sh` sekarang di-pipe lewat `tr -d '\r'`.

**Keterbatasan disengaja:**
- Endpoint internal (`GET /internal/orders/status`) dilewati capture karena
  `INTERNAL_API_KEY` kosong di `.env` lokal saat ini (bukan bug skrip — skrip mendeteksi
  ini dan mencetak pesan, bukan gagal diam-diam). Kalau `INTERNAL_API_KEY` diisi nanti,
  `capture` ulang akan otomatis menambah `internal-order-status.json`.
- `golden.sh` menjalankan API-nya sendiri (build+start+stop terisolasi di port
  `8097`), bukan memakai dev server yang sedang berjalan — supaya `capture`/`diff`
  reproducible tanpa tergantung state server lain.

### 2026-09-24 — Lanjutan 0D (Sisa Task Perkakas)
- Menjalankan E2E tests pada branch main. Tercatat 12 test gagal karena Playwright tidak dapat memuat server dev (`pnpm` dev tidak ter-start). Baseline kegagalan E2E sudah dicatat.
- Dibuat: `scripts/ec-v2/ownership.txt` dan `scripts/ec-v2/check-ownership.sh` untuk mengecek dan membatasi izin pengubahan file pada setiap agen EC-v2. Menggunakan backend script python internal pada bash shell.
- Dibuat: `scripts/ec-v2/any-check.sh` sebagai utility linter terbatas (mendata penggunaan `any`, `interface{}`, `@ts-ignore`, dll) pada file yang berubah.
- Dibuat: program Go `scripts/ec-v2/mintjwt/main.go` yang mengambil user data di database dan mint JWT signin untuk akun tertentu. Diimplementasikan clean tanpa memicu teguran type data.
- Dibuat: script bantu `create_test_accounts.js` & `check_profiles.js` yang menciptakan 4 akun `ec-{a,b,c,d}@kriya.test` dan mengatur role mereka menjadi 'customer' di Supabase DB.
- Dibuat: Log file kosongan (TEMPLATE dan salinannya dari `LOG-0A` hingga `LOG-I`) untuk catatan log tiap sub-agen.
- Ditulis: draf file panduan agen `AGENTS.md` (tidak akan di-commit melainkan disimpan lokal sebagai artefak).

## Permintaan lintas-domain

(tidak ada)
