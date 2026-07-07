# KRIYA — Master Plan & Kontrak

E-commerce furniture single-vendor (gaya IKEA, pasar Indonesia) + lapisan AI.
Repo: `kriya-commerce` · Versi 1.0 · 6 Juli 2026
**Pemilik dokumen: Satria.** Kontrak di file ini hanya boleh diubah oleh Satria. Agent yang butuh perubahan kontrak: tulis di bagian "Permintaan lintas-teritori" di file agent-mu, lalu berhenti.

---

## 0. Cara pakai (WAJIB untuk semua agent)

1. Baca file ini sampai habis.
2. Baca file teritorimu: `AGENT-FE.md` / `AGENT-BE.md` / `AGENT-AI.md` / `AGENT-QA.md`.
3. Cek bagian **Log** di file teritorimu untuk tahu posisi terakhir.
4. Kerjakan **SATU task** yang ditunjuk Satria (atau task berikutnya yang belum dicentang di milestone aktif).
5. Tutup sesi dengan ritual di Bagian 8.

Milestone aktif saat ini: **M2**. Hanya satu milestone terbuka pada satu waktu.

## 1. Produk (ringkas)

KRIYA menjual furniture flat-pack merek sendiri: katalog per ruangan, varian warna/ukuran, checkout dengan pembayaran Midtrans (SANDBOX — tidak ada uang nyata). Pembeda utamanya lapisan AI: pencarian semantik ("meja kayu untuk ruang kerja sempit"), rekomendasi produk serupa, chatbot RAG yang menguasai spesifikasi + panduan perakitan + kebijakan toko dan bisa cek status pesanan, serta otomasi engagement (konfirmasi order, abandoned-cart follow-up). Persona: pembeli guest, pembeli member, admin toko. Seluruh data sintetis dan didesain sengaja. Detail produk lengkap: `docs/PRD.md`.

## 2. Stack (FINAL — dilarang diganti tanpa persetujuan Satria)

| Lapisan | Teknologi |
|---|---|
| Frontend | Next.js (App Router) · React · TypeScript strict · Tailwind · shadcn/ui · TanStack Query (server state) · Zustand (client state) · supabase-js (auth saja) |
| Backend commerce | Go · Gin · GORM (model saja, migrasi via SQL file) |
| Backend AI | Python 3.11+ · FastAPI · pydantic v2 · psycopg3 + pgvector · httpx |
| Embedding | Gemini `text-embedding-004`, **768 dimensi** — dipakai di ingest, search, dan chatbot. Mengganti ini = re-ingest semua; hanya Satria yang boleh memutuskan. |
| LLM chatbot | MiMo via endpoint OpenAI-compatible (`LLM_BASE_URL`), model di-pin, tanpa fallback-chain |
| Otomasi | n8n self-hosted (Docker) |
| Data | Supabase: Postgres + Auth + Storage + pgvector |
| Pembayaran | Midtrans Snap, mode **Sandbox** |
| Infra dev | Docker Compose |

## 3. Struktur repo & teritori

```
kriya-commerce/
  CLAUDE.md                # pointer (lihat Bagian 11)
  KRIYA-MASTER.md          # file ini — pemilik: Satria
  AGENT-FE.md / AGENT-BE.md / AGENT-AI.md / AGENT-QA.md
  docker-compose.yml       # pemilik: Satria
  .env.example             # pemilik: Satria
  apps/web/                # TERITORI AGENT-FE
  services/api/            # TERITORI AGENT-BE (Gin)
  services/ai/             # TERITORI AGENT-AI (FastAPI)
  automation/n8n/          # TERITORI AGENT-AI (ekspor workflow .json)
  data/                    # TERITORI AGENT-AI (seed, KB, prompts, scripts, eval)
  supabase/migrations/     # BERSAMA — lihat aturan Bagian 7
  docs/                    # PRD, diagram — pemilik: Satria
```

Aturan emas: **agent hanya menulis di teritorinya sendiri.** File milik Satria boleh ditulis agent hanya dalam sesi yang Satria awasi langsung dan nyatakan eksplisit.

## 4. Layanan, port, environment

| Service | Port | Env kunci |
|---|---|---|
| web (Next) | 3000 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_AI_URL`, `NEXT_PUBLIC_CHAT_WEBHOOK_URL`, `NEXT_PUBLIC_USE_FIXTURES` |
| api (Gin) | 8080 | `SUPABASE_DB_URL`, `SUPABASE_JWT_SECRET`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `WEB_ORIGIN`, `INTERNAL_API_KEY` |
| ai (FastAPI) | 8000 | `SUPABASE_DB_URL`, `GEMINI_API_KEY`, `WEB_ORIGIN`, `INTERNAL_API_KEY` |
| n8n | 5678 | kredensial diisi via UI n8n: LLM (`base_url`, key, model), Gemini key, Postgres, `INTERNAL_API_KEY`, SMTP/Telegram |

Secret hanya hidup di `.env` (tidak pernah di-commit) dan di kredensial n8n. `INTERNAL_API_KEY` = shared secret untuk endpoint internal antar-service.

## 5. Konvensi global (berlaku untuk SEMUA kode)

- JSON: **snake_case** untuk semua field, request dan response.
- Prefix path: Gin `/api/v1/...`, FastAPI `/ai/v1/...`.
- Harga: **integer rupiah** tanpa sen (`1250000`). Format tampilan urusan FE.
- ID: uuid. Produk & kategori juga punya `slug` unik kebab-case; URL FE memakai slug.
- Waktu: kolom `timestamptz`, di JSON ISO 8601 UTC (`2026-07-06T14:00:00Z`).
- Pagination list: `?page=1&limit=20` (limit maks 60) → `meta`.
- Envelope sukses: `{"data": {...}}`; list: `{"data": [...], "meta": {"page": 1, "limit": 20, "total": 137}}`.
- Envelope error: `{"error": {"code": "...", "message": "..."}}` + status HTTP tepat. Kode: `validation_error`, `unauthorized`, `forbidden`, `not_found`, `conflict`, `payment_error`, `internal`.
- Auth: FE memegang sesi via supabase-js dan mengirim `Authorization: Bearer <jwt>`; Gin & FastAPI memverifikasi HS256 dengan `SUPABASE_JWT_SECRET`.
- CORS: izinkan origin `WEB_ORIGIN` saja.
- **FE dilarang query tabel Supabase langsung** (pengecualian: Auth via supabase-js, dan upload Storage di halaman admin). Semua data lewat API Gin/FastAPI.
- n8n boleh akses DB langsung: **read semua tabel; write HANYA kolom bertanda n8n-writable** (Bagian 7).
- Seluruh teks UI berbahasa Indonesia.

## 6. Kontrak API (M1–M4 — DIKUNCI; admin M6 difinalkan di gerbang M6)

### Gin — publik
- `GET /api/v1/categories` → `{"data": [{"id", "slug", "name"}]}`
- `GET /api/v1/products?category=&q=&min_price=&max_price=&sort=&page=&limit=`
  `sort`: `newest` (default) | `price_asc` | `price_desc`. `q` = keyword ILIKE sederhana (pencarian pintar ada di FastAPI).
  → item list: `{"id", "slug", "name", "category_slug", "price_min", "thumbnail_url"}`
- `GET /api/v1/products/{slug}` →
  `{"data": {"id", "slug", "name", "description", "category": {"slug", "name"}, "materials": ["kayu jati"], "dimensions": {"width_cm", "depth_cm", "height_cm"}, "weight_kg", "images": [{"url", "alt"}], "variants": [{"id", "sku", "color", "size", "price", "stock"}], "has_assembly_guide": true}`

### Gin — butuh auth
- `GET /api/v1/cart` dan `PUT /api/v1/cart` body `{"items": [{"variant_id", "qty"}]}` (upsert penuh; server yang menghitung harga) →
  `{"data": {"items": [{"variant_id", "qty", "price", "subtotal", "product": {"slug", "name", "thumbnail_url", "color", "size"}}], "total"}}`
- `POST /api/v1/orders` body `{"items": [{"variant_id", "qty"}], "shipping_zone": "jawa_bali" | "luar", "shipping_address": {"recipient", "phone", "address_line", "city", "province", "postal_code"}}` →
  `{"data": {"order": <order>, "snap_token", "midtrans_client_key"}}`
  Ongkir flat (konstanta server): `jawa_bali` = 150000, `luar` = 300000.
- `GET /api/v1/orders` (milik user) dan `GET /api/v1/orders/{id}` →
  `<order>` = `{"id", "status", "items": [{"name", "color", "size", "qty", "price", "subtotal"}], "subtotal", "shipping_cost", "total", "shipping_address": {...}, "created_at"}`

### Gin — webhook & internal
- `POST /api/v1/payments/midtrans/notification` — tanpa auth; WAJIB verifikasi signature SHA-512; idempoten; → 200.
- `GET /api/v1/internal/orders/status?order_id=&email=` — header `X-Internal-Key: <INTERNAL_API_KEY>`; dipakai chatbot n8n → `{"data": {"order_id", "status", "total", "created_at"}}` atau 404.

Status order: `pending_payment → paid → processing → shipped → completed`, terminal lain: `cancelled`, `expired`. Stok: dicek dan **direservasi (dikurangi) saat order dibuat**, dikembalikan saat `expired`/`cancelled`.

### FastAPI
- `GET /ai/v1/search?q=&limit=12` → `{"data": [{"product_id", "slug", "name", "price_min", "thumbnail_url", "score"}], "meta": {"mode": "semantic" | "keyword_fallback"}}`
  Jika skor tertinggi < ambang (default 0.35) atau hasil kosong → fallback ILIKE ke tabel products, `mode = "keyword_fallback"`.
- `GET /ai/v1/products/{id}/similar?limit=6` → bentuk sama tanpa `meta.mode`, tidak menyertakan produk itu sendiri.
- `POST /ai/v1/embed` body `{"texts": ["..."]}` → `{"data": {"embeddings": [[768 float]]}}` — internal, header `X-Internal-Key`.

### Chat (M4 — n8n webhook)
- `POST {NEXT_PUBLIC_CHAT_WEBHOOK_URL}` body `{"session_id", "message", "user": {"email": "..." | null}}` →
  `{"reply", "sources": [{"type": "product" | "guide" | "faq" | "policy", "ref": "<slug/judul>"}]}`

### Kontrak file seed (AGENT-AI memproduksi → AGENT-BE mengonsumsi)
`data/seed/products.json`:
```json
{
  "categories": [{"slug": "living-room", "name": "Living room"}],
  "products": [{
    "slug": "taru-work-desk", "name": "TARU work desk",
    "category_slug": "workspace", "description": "...",
    "materials": ["pine wood", "steel"],
    "dimensions": {"width_cm": 120, "depth_cm": 60, "height_cm": 75},
    "weight_kg": 18.5, "has_assembly_guide": true,
    "images": [{"storage_path": "products/taru-work-desk-1.jpg", "alt": "..."}],
    "variants": [{"sku": "TARU-WD-NAT", "color": "natural", "size": null, "price": 1250000, "stock": 12}]
  }]
}
```
Kategori final (6): `living-room`, `bedroom`, `workspace`, `dining-room`, `storage`, `lighting`.

**Fixtures FE wajib mengikuti kontrak di atas byte-per-byte** (nama field, bentuk envelope).

## 7. Skema database & kepemilikan migrasi

Folder tunggal `supabase/migrations`, penamaan `NNN_deskripsi.sql` berurutan. Sebelum membuat file: `git pull`, pakai nomor `max + 1`. **Dilarang mengubah tabel milik agent lain** — ajukan lewat Satria.

**Milik AGENT-BE (commerce):**
`profiles` (id = auth.users.id, role text default 'customer', dibuat via trigger on signup) · `categories` · `products` · `product_variants` (sku unik, color, size null-able, price int, stock int) · `product_images` · `assembly_guides` (product_id, content_md) · `carts` (user_id unik, items jsonb, updated_at, **followed_up_at [n8n-writable]**) · `orders` (**reminded_at [n8n-writable]**) · `order_items` · `payments` (order_id, midtrans_order_id, transaction_status, raw jsonb)

**Milik AGENT-AI (vector):**
`documents` (id bigserial, content text, metadata jsonb, embedding vector(768)) · index HNSW cosine · fungsi `match_documents(query_embedding vector(768), match_count int, filter_type text default null)` · metadata: `{"type": "product" | "guide" | "faq" | "policy", "product_id": "<uuid|null>", "ref": "<slug/judul>"}`

## 8. Cara kerja (trunk-based + teritori)

- Branch utama: `main`. Branch task berumur < 1 hari boleh, langsung merge. Branch panjang DILARANG.
- **Ritual sesi:** `git pull` → kerjakan satu task → build & test hijau → commit `"[fe|be|ai] deskripsi singkat"` → push → tambah satu baris di Log file agent-mu.
- QA boleh jalan paralel untuk memvalidasi hasil task yang sudah siap diuji; QA tidak mengambil alih implementasi.
- Paralel sungguhan: satu working copy per agent (`git worktree`). Dua agent dalam satu folder kerja = dilarang.
- Butuh sesuatu di luar teritori (endpoint baru, kolom baru, perubahan kontrak): **berhenti**, tulis di "Permintaan lintas-teritori" di file agent-mu. Satria memutuskan, kontrak diubah dulu, baru kode.
- Definition of done task: berjalan + build hijau + tidak menyentuh file di luar teritori + log terisi.
- Gerbang milestone: kriteria demo terpenuhi → review Satria → baru milestone berikutnya dibuka.

## 9. Roadmap × agent

| Milestone | FE | BE | AI | QA |
|---|---|---|---|---|
| M0 Fondasi | scaffold Next + fixtures | scaffold Gin + healthz + Dockerfile | scaffold FastAPI + healthz + Dockerfile | smoke build per service, cek healthz |
| M1 Katalog | layout, home, listing, PDP (fixtures → live) | migrasi commerce, endpoint katalog, seed loader | `products.json` 60 item + gambar + KB docs | validasi kontrak listing/detail/fixture |
| M2 Transaksi | auth, cart, checkout, Snap popup, halaman pesanan | cart, orders, Midtrans, webhook | (siapkan ingest & prompt) | auth, cart, checkout, webhook, order flow |
| M3 AI search | search bar + halaman hasil, blok "Produk serupa" | — | migrasi vector, ingest, /search, /similar | semantic search + fallback + similar |
| M4 Chatbot | chat widget | endpoint internal status order | workflow n8n agent + eval 25 soal | webhook chat + sumber + status lookup |
| M5 Otomasi | — | dukungan kolom/status | workflow konfirmasi, abandoned cart, notif status | workflow check + kolom n8n-writable |
| M6 Admin | halaman admin CRUD | endpoint admin (kontrak difinalkan di gerbang) | — | guard admin + CRUD / status validation |
| M7 Rilis | polish | polish | polish | smoke lintas service + regresi akhir |

Demo criteria per milestone: lihat `docs/PRD.md` Bagian 6.

## 10. Larangan global

Jangan commit `.env`/secret/`node_modules`/venv. Jangan ubah file milik Satria (master, compose, .env.example) tanpa sesi yang diawasi. Jangan menambah dependency besar atau mengganti library inti tanpa persetujuan. Jangan menulis di teritori agent lain. Jangan membuat mock/fixture yang menyimpang dari kontrak. Jangan memakai nama produk IKEA atau brand nyata. Jangan menaruh API key di kode. Jangan pakai `AutoMigrate` — semua perubahan skema lewat file migrasi.

## 11. Setup Claude Code

Isi `CLAUDE.md` di root repo:

```
Proyek KRIYA (e-commerce furniture + AI). WAJIB baca KRIYA-MASTER.md
sebelum melakukan apa pun. Peranmu ditentukan di awal sesi:
FE -> baca AGENT-FE.md · BE -> baca AGENT-BE.md · AI/data -> baca AGENT-AI.md.
QA -> baca AGENT-QA.md.
Patuhi teritori, kontrak, dan ritual sesi di KRIYA-MASTER.md.
Kerjakan hanya SATU task per sesi. Jika butuh perubahan di luar
teritorimu: berhenti dan tulis di "Permintaan lintas-teritori".
```
