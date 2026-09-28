# Rencana: Percepat loading halaman (latensi DB & round-trip)

> Dokumen rencana (handoff). Disusun 2026-09-28 untuk dikerjakan agent/sesi berikutnya.
> **Belum dieksekusi.** Ikuti teritori & ritual sesi di `docs/agents/KRIYA-MASTER.md`
> (selama program EC-v2 berjalan: `docs/rencana/EKSEKUSI-PARALEL-V2.md`).

## Context

Satria melaporkan: setiap halaman terasa lambat saat loading. Pertanyaannya: query
backend kurang efektif, atau keterbatasan Supabase?

**Jawaban singkat: bukan keduanya secara langsung.** Eksekusi query di Postgres
hampir nol. Waktu habis di **jaringan**: setiap query = 1 round-trip ke pooler
Supabase di **Sydney** (`aws-1-ap-southeast-2`) ≈ **0,34 s** dari lokasi dev
(Indonesia), dan satu endpoint menjalankan beberapa query **berurutan**.

### Baseline terukur (2026-09-28, API lokal → Supabase cloud, `GIN_MODE=release`)

| Endpoint | Request ke-1 (cold) | Request ke-2 (warm) | Perkiraan jumlah query |
|---|---|---|---|
| `/healthz` (tanpa DB) | 0,003 s | 0,002 s | 0 |
| `GET /api/v1/tags` | 0,68 s | 0,34 s | 1 |
| `GET /api/v1/categories` | 1,09 s | 0,34 s | 1 |
| `GET /api/v1/products/:slug/related` | 0,68 s | 0,34 s | 1 (+preload) |
| `GET /api/v1/products?limit=20&featured=true` | 1,36 s | 0,68 s | 2+ |
| `GET /api/v1/products?limit=20` | 2,74 s | 1,36 s | 4 (count + find + 2 preload) |
| `GET /api/v1/attributes` | 2,04 s | 1,02 s | 3 (attrs + terms + counts) |
| `GET /api/v1/products/:slug` | **5,65 s** | **2,71 s** | ~8 (product + 7 preload) |

TCP connect ke `aws-1-ap-southeast-2.pooler.supabase.com:5432` ≈ 0,35–0,43 s.
DNS lookup host pooler kadang ≈ 1 s (lihat catatan DNS di bawah).

Rumus kasar yang cocok dengan semua angka: **waktu endpoint ≈ jumlah query × RTT**.
Request pertama ≈ 2× karena pgx menyiapkan (prepare) statement baru dengan
round-trip tambahan, dan koneksi baru butuh TLS + auth.

### Akar masalah (urut dampak)

1. **Region DB jauh.** Project Supabase di Sydney. Pasar & dev di Indonesia →
   region terdekat Singapura (`ap-southeast-1`). Ini **pengali** semua masalah lain.
2. **N query berurutan per endpoint (GORM `Preload`).** Tiap `Preload` = satu
   query terpisah yang menunggu query sebelumnya:
   - `services/api/internal/catalog/repository.go` `GetProductBySlug`: `Category.Parent`,
     `Variants`, `Images`, `Tags` (many2many = 2 query), `AttributeTerms` (2 query),
     `AttributeTerms.Attribute`.
   - `GetProducts`: `Count` + `Find` + `Preload Variants` + `Preload Images`.
   - `GetAttributes` + `GetProductCountsForTerms` (handler memanggil keduanya berurutan).
3. **Connection pool tidak dikonfigurasi.** `services/api/internal/db/db.go` hanya
   `gorm.Open(...)` → default `database/sql`: **MaxIdleConns = 2**, tanpa batas
   open conns. Request paralel dari FE (home = 3 product rail + categories) membuat
   koneksi baru (TLS + auth ke Sydney) lalu membuangnya, dan cache prepared
   statement pgx ikut hilang bersama koneksinya.
4. **FE: fetch ganda & tanpa cache.**
   - `apps/web/app/(store)/products/[slug]/page.tsx` → `generateMetadata` memanggil
     `getProduct(slug)` di server (~2,7 s), lalu `ProductDetailView`
     (`components/kriya/product-detail-view.tsx:42`, `useProduct`) mengambil data yang
     sama lagi di client. Halaman detail ≈ 5–6 s.
   - `apps/web/app/(store)/layout.tsx` memanggil `getCategories()` di server tanpa
     cache → +1 round-trip DB di **setiap** navigasi halaman toko.
   - `lib/http.ts` `request()` memakai `fetch` polos tanpa opsi cache/revalidate.

### Temuan sampingan (bukan performa, catat saja)

- `lib/http.ts` `getLocaleCookie()` selalu mengembalikan `"id"` di server
  (`window` tidak ada), dan `getCategories()` tidak meneruskan `lang` → kategori
  hasil render server selalu bahasa Indonesia meski locale EN. Laporkan ke FE.
- `middleware.Admin` (`services/api/internal/middleware/admin.go`) menambah 1 query
  `profiles.role` di setiap request admin (+0,34 s). Opsional: role dari klaim JWT
  / cache singkat. Prioritas rendah.

---

## Fase (satu task per sesi, per teritori)

Target realistis setelah Fase 1–3 **tanpa pindah region**: detail produk ≈ 0,4–0,7 s
di API (dari 2,7 s), list ≈ 0,35–0,7 s, halaman detail end-to-end ≈ ≤ 1 s.
Setelah Fase 4 (Singapura), semua angka turun lagi kira-kira sebanding RTT baru.

### Fase 1 — BE: konfigurasi connection pool (kecil, dampak langsung)

Teritori: AGENT-BE (`services/api/`).

- `internal/db/db.go`: setelah `gorm.Open`, ambil `sqlDB, _ := db.DB()` lalu set:
  - `SetMaxOpenConns(10)` — **jangan melebihi pool size session pooler Supabase**
    (cek di Dashboard → Database → Connection pooling; session mode membatasi jumlah
    client = pool size, kelebihan → error `max clients reached`). Jadikan env
    `DB_MAX_OPEN_CONNS` dengan default 10 bila perlu (env baru = izin Satria,
    lihat Bagian 4 master).
  - `SetMaxIdleConns(10)` (= MaxOpenConns).
  - `SetConnMaxIdleTime(30 * time.Minute)`, `SetConnMaxLifetime(60 * time.Minute)`.
- Opsional: warm-up pool saat start (`sqlDB.PingContext` beberapa kali paralel)
  supaya request pertama tidak bayar TLS+auth.
- `gorm.Config{SkipDefaultTransaction: true}` **hanya bila** sudah dipastikan semua
  write multi-langkah memakai `db.Transaction` eksplisit (ledger/checkout sudah).
  Ini menghemat 2 round-trip (BEGIN/COMMIT) per write tunggal. Kalau ragu, lewati.
- **Verifikasi:** jalankan skrip ukur (lihat "Cara ukur") → request serentak dari
  home tidak lagi mengalami lonjakan cold; angka warm stabil.

> **✅ SELESAI 2026-09-28 (Claude, sesi diawasi Satria).** `internal/db/db.go`:
> MaxOpen = MaxIdle = 10, ConnMaxIdleTime 30 m, ConnMaxLifetime 60 m, warm-up 6
> koneksi paralel saat start. `SkipDefaultTransaction` **tidak** diubah.
> Hasil burst serentak ala home (categories + 3 rail + tags + attributes), 3 kali:
> sebelum 7,9 / 7,0 / 5,8 s → sesudah 4,8 / 4,3 / 4,3 s. Endpoint tunggal berurutan
> tidak berubah (memang bukan sasaran Fase 1).
>
> **Temuan baru untuk Fase 2 — biaya prepare per koneksi.** Uji 6× `/tags` serentak:
> koneksi baru ≈ 2,9 s (TLS+auth), koneksi hangat tapi query pertama kali di koneksi
> itu ≈ 0,7–1,0 s (pgx `QueryExecModeCacheStatement` = Prepare dulu, +1 RTT), setelah
> itu 0,34 s (RTT murni, tidak ada antrean di pool/pooler). Cache statement pgx
> **per koneksi per teks SQL**, dan `Preload` GORM menghasilkan `IN ($1..$n)` dengan n
> berbeda-beda (jumlah produk hasil) → teks SQL baru → prepare lagi. Karena itu Fase 2
> sebaiknya menghasilkan SQL yang **teksnya stabil** (mis. `= ANY($1)` dengan array,
> bukan `IN` panjang variabel), bukan cuma lebih sedikit query.
> Mengganti mode pgx ke `QueryExecModeExec`/simple protocol (selalu 1 RTT) **sengaja
> tidak dilakukan**: parameter `[]byte` untuk kolom `jsonb` (`*_i18n` di write admin)
> akan dikirim sebagai `bytea` dan berisiko rusak. Evaluasi hanya bila Fase 2 belum cukup,
> dengan uji write admin penuh.

### Fase 2 — BE: gabungkan query berurutan jadi 1–2 query

Teritori: AGENT-BE. **Bentuk respons JSON tidak boleh berubah** (kontrak Bagian 6).

- **Wajib sebelum mengubah:** simpan respons golden untuk beberapa slug/filter
  (`curl ... > before.json`), lalu bandingkan dengan `after.json` setelah refactor
  (`diff` setelah `jq -S`). Ini satu-satunya jaring pengaman untuk bentuk respons.
- `GetProductBySlug`: ganti rantai `Preload` dengan **satu** query SQL mentah:
  produk `JOIN categories c` `LEFT JOIN categories parent`, ditambah subquery
  `json_agg`/`jsonb_agg` untuk variants (aktif), images, tags, dan attribute terms
  (+ nama atribut). Scan ke struct dengan field `json.RawMessage` lalu
  `json.Unmarshal` ke slice bertipe konkret (tanpa `interface{}` — Bagian 5).
  Target: 1 round-trip.
- `GetProducts`:
  - Ganti `Count` + `Find` terpisah dengan `COUNT(*) OVER() AS total_count` di query
    utama (1 query). Perhatikan query ber-`GROUP BY products.id` (filter harga/stok) —
    window function dihitung setelah GROUP BY, jadi tetap benar.
  - Ganti `Preload Variants` + `Preload Images(is_primary)` dengan subquery
    `json_agg` di SELECT yang sama. Target: 1 round-trip (dari 4).
- `GetAttributes` + `GetProductCountsForTerms`: satu query yang men-join
  `attributes`, `attribute_terms`, dan hitungan produk per term (CTE), atau minimal
  jalankan keduanya **paralel** (`errgroup`) bila penggabungan terlalu rumit.
  Target: 1 round-trip (dari 3).
- `GetRelatedProducts`: sama seperti list (preload → `json_agg`).
- Index: migrasi 013 (F3-Z) sudah menambah 13 index; cek `EXPLAIN ANALYZE` query baru
  lewat Supabase MCP/SQL editor. Migrasi index baru = aturan Bagian 7 (file bersama).
- **Verifikasi:** golden diff kosong + angka warm per endpoint ≈ 1× RTT
  (≈ 0,34 s dari Sydney). Tambah test Go untuk fungsi scan/unmarshal agregat.

### Fase 3 — FE: hapus fetch ganda & cache data katalog publik

Teritori: AGENT-FE (`apps/web/`). **Baca dulu `node_modules/next/dist/docs/`**
(lihat `apps/web/AGENTS.md`: Next 16 punya API caching berbeda dari versi lama —
jangan menebak `fetch` cache semantics / `revalidate` / `"use cache"` dari ingatan).

- Detail produk: ambil produk **sekali** di server (`page.tsx`), pakai untuk
  `generateMetadata` (dedupe lewat `React.cache` atau mekanisme memo Next 16) dan
  kirim ke client sebagai `initialData` untuk `useProduct` (atau prefetch +
  `HydrationBoundary` TanStack Query). Client tidak boleh refetch saat mount
  (staleTime global sudah 60 s di `app/providers.tsx`).
- `getCategories()` di layout toko: cache dengan revalidasi (mis. 5 menit) — data
  kategori jarang berubah. Pastikan kunci cache memuat locale (lihat temuan sampingan
  soal `lang` di server; perbaiki sekalian karena kunci cache bergantung padanya).
- Home: pertimbangkan prefetch 3 product rail di server secara paralel
  (`Promise.all`) + `HydrationBoundary`, supaya tidak ada waterfall
  HTML → JS → 3 fetch client.
- Hanya endpoint **publik** katalog yang boleh di-cache di server. Endpoint ber-auth
  (cart, orders, profile, admin) **jangan** di-cache lintas request.
- **Verifikasi:** DevTools Network pada halaman detail → hanya 1 request
  `/products/:slug` (dari server), tidak ada duplikat dari client; navigasi antar
  halaman toko tidak memicu `/categories` berulang dalam jendela revalidasi.
  `pnpm build` + lint hijau.

### Fase 4 — Satria: pindah project Supabase ke Singapura (keputusan pemilik)

Bukan teritori agent — **butuh keputusan & eksekusi Satria** (kredensial, dashboard).
Region project Supabase tidak bisa diubah; harus project baru.

Garis besar:
1. Buat project baru region `ap-southeast-1` (Singapore).
2. Terapkan semua `supabase/migrations/*.sql` berurutan (termasuk 013).
3. Pindahkan data: `pg_dump --data-only` dari project lama → restore ke baru
   (atau jalankan ulang seed `services/api/cmd/seed`), plus user `auth.users`
   bila perlu dipertahankan, plus isi Storage bucket (gambar produk).
4. Konfigurasi Auth (provider, redirect URL, JWT signing keys / JWKS) sama seperti lama.
5. Ganti di `.env` / `apps/web/.env.local` / kredensial n8n / secret CI & helm:
   `SUPABASE_DB_URL`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`.
   `next.config.ts` `remotePatterns` membaca host dari env → ikut berubah otomatis.
6. Ulangi skrip ukur; bandingkan dengan baseline di atas.

Alternatif bila tidak mau pindah: Fase 1–3 saja sudah memangkas mayoritas latensi.

### Catatan lingkungan dev (bukan kode)

- DNS lookup host pooler kadang ≈ 1 s → gejala sama dengan masalah DNS router yang
  pernah terjadi (DNS Wi-Fi di-set manual ke 1.1.1.1/8.8.8.8). Cek ulang setelan DNS
  adapter yang aktif bila lookup lambat masih terlihat.

---

## Cara ukur (pakai sebelum & sesudah tiap fase)

Jalankan API di port terpisah agar tidak bentrok dengan `dev.ps1` (Git Bash):

```bash
cd services/api
set -a && . ../../.env && set +a
PORT=8099 GIN_MODE=release go run ./cmd/api &
B=http://localhost:8099
SLUG=$(curl -s "$B/api/v1/products?limit=1" | grep -o '"slug":"[^"]*"' | head -1 | cut -d'"' -f4)
for round in 1 2; do
  for u in /healthz /api/v1/categories "/api/v1/products?limit=20" \
           "/api/v1/products?limit=20&featured=true" "/api/v1/products/$SLUG" \
           "/api/v1/products/$SLUG/related?type=upsell" /api/v1/attributes /api/v1/tags; do
    curl -s -o /dev/null -w "%{time_total}s %{http_code} $u\n" "$B$u"
  done; echo ---
done
```

Round 1 = cold (koneksi/statement baru), round 2 = warm. Catat hasil di laporan sesi
agar bisa dibandingkan dengan tabel baseline.

## Definition of Done keseluruhan

- [ ] Fase 1: pool dikonfigurasi, tidak ada error `max clients` saat request paralel.
- [ ] Fase 2: detail/list/attributes masing-masing ≤ 2 round-trip; golden diff kosong.
- [ ] Fase 3: tidak ada fetch ganda di detail produk; kategori ter-cache di layout.
- [ ] Fase 4 (opsional, Satria): project di Singapura, baseline diukur ulang.
- [ ] Tiap fase menutup sesi dengan ringkasan di `docs/state/`.
