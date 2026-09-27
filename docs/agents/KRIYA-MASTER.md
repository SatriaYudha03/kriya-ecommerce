# KRIYA — Master Plan & Kontrak

E-commerce furniture single-vendor (gaya IKEA, pasar Indonesia) + lapisan AI.
Repo: `kriya-commerce` · Versi 1.0 · 6 Juli 2026
**Pemilik dokumen: Satria.** Kontrak di file ini hanya boleh diubah oleh Satria. Agent yang butuh perubahan kontrak: tulis di bagian "Permintaan lintas-teritori" di file agent-mu, lalu berhenti.

---

## 0. Cara pakai (WAJIB untuk semua agent)

1. Baca file ini sampai habis.
2. Baca file teritorimu: `docs/agents/AGENT-FE.md` / `docs/agents/AGENT-BE.md` / `docs/agents/AGENT-AI.md` / `docs/agents/AGENT-QA.md` / `docs/agents/AGENT-DEVSECOPS.md`.
3. Cek bagian **Log** di file teritorimu untuk tahu posisi terakhir.
4. Kerjakan **SATU task** yang ditunjuk Satria (atau task berikutnya yang belum dicentang di milestone aktif).
5. Tutup sesi dengan ritual di Bagian 8.

**Status milestone (per 8 Juli 2026):** M1–M3 tuntas lintas-agent. M6 (Admin) FE/BE/QA tuntas. **M4 (Chatbot) belum tuntas** — FE widget selesai, tetapi backend chat AI (`chatbot_system.md`, workflow n8n `chatbot.json`, eval 25 soal) masih terbuka; validasi QA M4 baru mencakup shell widget FE, bukan alur end-to-end. M5 (Otomasi) belum dimulai. M7 (Rilis) belum dibuka. Prioritas berikut: tuntaskan sisi AGENT-AI di M4 sebelum lanjut M5.

Aturan "satu milestone terbuka" berlaku untuk track produk M0–M7. Track DevSecOps (D0–D5) berjalan **paralel** dan tidak terhitung dalam aturan itu (lihat Bagian 9).

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
  docker-compose.yml       # pemilik: Satria
  .env.example             # pemilik: Satria
  apps/web/                # TERITORI AGENT-FE
  services/api/            # TERITORI AGENT-BE (Gin)
  services/ai/             # TERITORI AGENT-AI (FastAPI)
  automation/n8n/          # TERITORI AGENT-AI (ekspor workflow .json)
  data/                    # TERITORI AGENT-AI (seed, KB, prompts, scripts, eval)
  supabase/migrations/     # BERSAMA — lihat aturan Bagian 7
  infra/                   # TERITORI AGENT-DEVSECOPS (Terraform, k3s bootstrap)
  helm/                    # TERITORI AGENT-DEVSECOPS (chart & values k8s)
  .github/workflows/       # TERITORI AGENT-DEVSECOPS (CI/CD)
  docs/                    # pemilik: Satria — PENGECUALIAN: AGENT-DEVSECOPS boleh menulis
                           # docs/devops/*.md (arsitektur, rollback) tanpa sesi diawasi;
                           # semua agent WAJIB menulis ringkasan sesi di docs/state/ (Bagian 8);
                           # file docs/ lainnya (termasuk PRD.md) tetap milik Satria
    agents/                # KRIYA-MASTER.md (file ini) + AGENT-FE/BE/AI/QA/DEVSECOPS.md
    rencana/                # rencana fitur belum/sedang dieksekusi (RENCANA-*.md, EKSEKUSI-*.md, seed-orders-plan.md)
    prompts/                # prompt peluncuran workflow n8n (PROMPT-N8N-*.md)
    devops/                 # docs milik AGENT-DEVSECOPS (devops-architecture.md, devops-rollback.md)
    state/                  # ringkasan akhir sesi tiap agent — lihat Bagian 8
```

Aturan emas: **agent hanya menulis di teritorinya sendiri.** File milik Satria boleh ditulis agent hanya dalam sesi yang Satria awasi langsung dan nyatakan eksplisit, kecuali pengecualian `docs/devops/*.md` dan `docs/state/*.md` di atas.

**Catatan gap terbuka:** `docs/PRD.md` dirujuk di Bagian 1, 6, dan 9 tapi belum ada di repo. Sampai Satria membuatnya, kriteria demo per milestone (Bagian 9) belum punya sumber definitif — agent QA memakai kontrak Bagian 6 sebagai acuan sementara.

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
- UI mendukung dua bahasa EN/ID; default `id`. Locale disimpan di cookie `kriya-locale`.
- **Tipe data wajib eksplisit — `any` DILARANG di semua bahasa.** Setiap payload yang menyeberangi batas (HTTP, seed, storage, props komponen) harus punya tipe/struct/model konkret yang mengikuti kontrak Bagian 6.
  | Bahasa | Dilarang | Pakai ini |
  |---|---|---|
  | TypeScript | `any`, `as any`, `<any>`, `any[]` | tipe/`interface` konkret · `unknown` + penyempitan (`instanceof`, type guard) · generic · union literal |
  | Go | `interface{}` / `any` untuk payload berkontrak, `map[string]interface{}` | struct dengan tag json snake_case · `json.RawMessage` bila memang payload mentah (mis. `payments.raw`) · generic |
  | Python | `typing.Any`, dict tanpa skema | model pydantic v2 · `TypedDict` · generic · `object` + penyempitan |

  Data yang bentuknya sungguh-sungguh tidak diketahui (respons pihak ketiga, `catch`/`except`) masuk sebagai `unknown` / `error` / `Exception` lalu **dipersempit sebelum dipakai** — bukan `any`. Kalau sebuah tipe terasa mustahil dibuat, itu gejala kontrak atau desainnya yang perlu diperbaiki: **berhenti dan ajukan lewat "Permintaan lintas-teritori"**, jangan ditambal `any`. Cast `as any` untuk membungkam compiler adalah pelanggaran, bukan solusi sementara.

## 6. Kontrak API (v2 — Modular Per Domain)

Seluruh payload mengikuti konvensi Bagian 5 (envelope `{"data": ...}`, snake_case, tipe data eksplisit).

### 6.1 Domain A: Katalog & Inventori (`/api/v1`)
**Publik:**
- `GET /api/v1/categories?lang=en|id` → daftar kategori pohon/hirarkis (dengan `parent_id`, `children`).
- `GET /api/v1/categories/:slug?lang=en|id` → detail kategori dengan sub-kategori.
- `GET /api/v1/products?category=&category_slug=&attrs=&tag=&min_price=&max_price=&on_sale=&sort=&page=&limit=&lang=en|id` → daftar produk dengan filter facet atribut, sale price, dan rating.
- `GET /api/v1/products/:slug?lang=en|id` → detail produk dengan varian lengkap, harga sale terhitung (`kriya_effective_price`), atribut, tags, dan status ketersediaan.
- `GET /api/v1/products/:slug/related?type=upsell|cross_sell&limit=6&lang=en|id` → rekomendasi produk terkait.
- `GET /api/v1/tags` → daftar tag produk aktif.
- `GET /api/v1/attributes` → daftar atribut produk beserta term/nilainya untuk facet filter.

**Admin (`/api/v1/admin` — Role `admin`):**
- `GET/POST /api/v1/admin/categories`, `GET/PUT/DELETE /api/v1/admin/categories/:id`
- `GET/POST /api/v1/admin/products`, `GET/PUT/DELETE /api/v1/admin/products/:id`
- `POST/PUT/DELETE /api/v1/admin/products/:id/images[/:image_id]`
- `POST/PUT/DELETE /api/v1/admin/products/:id/variants[/:variant_id]`
- `GET/POST /api/v1/admin/tags`, `PUT/DELETE /api/v1/admin/tags/:id`
- `GET/POST /api/v1/admin/attributes`, `PUT/DELETE /api/v1/admin/attributes/:id`
- `POST /api/v1/admin/attributes/:id/terms`, `PUT/DELETE /api/v1/admin/attributes/:id/terms/:term_id`
- `GET /api/v1/admin/inventory` → stok varian dengan filter low stock alert.
- `GET /api/v1/admin/inventory/movements` → audit log mutasi stok ledger.
- `POST /api/v1/admin/inventory/adjustments` → penyesuaian stok manual oleh admin via ledger.

### 6.2 Domain B: Customer & Pengaturan Toko (`/api/v1`)
**Authed (Customer):**
- `GET/PUT /api/v1/profile` → profil pelanggan.
- `GET/POST /api/v1/addresses`, `PUT/DELETE /api/v1/addresses/:id`, `POST /api/v1/addresses/:id/default` → buku alamat multi-alamat.
- `GET/PUT /api/v1/cart` → keranjang belanja relasional (`cart_items`), kalkulasi harga server-side.
- `POST /api/v1/cart/merge` → sinkronisasi keranjang lokal (guest) dengan server saat login.
- `GET/PUT /api/v1/wishlist`, `DELETE /api/v1/wishlist/:variant_id` → manajemen produk favorit/wishlist.
- `POST /api/v1/orders/:id/pay` → lanjut bayar transaksi tertunda, regenerasi Snap token.

**Publik:**
- `GET /api/v1/shipping/provinces` → referensi data provinsi & zona ongkir.
- `GET /api/v1/store` → informasi profil toko & pengaturan publik.

**Admin (`/api/v1/admin`):**
- `GET /api/v1/admin/customers`, `GET /api/v1/admin/customers/:id` → daftar & histori customer.
- `GET /api/v1/admin/shipping/zones` → daftar zona pengiriman & tarif.
- `PUT /api/v1/admin/shipping/methods/:id` → konfigurasi tarif dan status metode kirim.
- `GET/PUT /api/v1/admin/settings` → pengaturan toko (threshold gratis ongkir, low-stock threshold, kontak).

### 6.3 Domain C: Promosi, Kupon & Laporan (`/api/v1`)
**Publik:**
- `GET /api/v1/coupons/public` → daftar kupon promosi publik aktif.
- `POST /api/v1/coupons/validate` body `{"code": "...", "items": [...]}` → validasi syarat & simulasi diskon kupon.

**Admin (`/api/v1/admin`):**
- `GET/POST /api/v1/admin/coupons`, `GET/PUT/DELETE /api/v1/admin/coupons/:id` → CRUD kupon diskon.
- `GET /api/v1/admin/coupons/:id/redemptions` → audit riwayat pemakaian kupon per order/customer.
- `GET /api/v1/admin/reports/summary` → ringkasan omzet, pesanan, dan diskon periode tertentu.
- `GET /api/v1/admin/reports/sales` → grafik deret waktu penjualan harian/bulanan.
- `GET /api/v1/admin/reports/top-products` → pemeringkatan produk terlaris berdasarkan kuantitas & nilai.
- `GET /api/v1/admin/stats` → metrik ringkas kartu dashboard admin.

### 6.4 Domain D: Purna Jual / After-sales (`/api/v1`)
**Authed (Customer):**
- `GET /api/v1/orders`, `GET /api/v1/orders/:id` → riwayat & detail transaksi customer v2.
- `POST /api/v1/orders/:id/cancel` body `{"reason": "..."}` → pembatalan pesanan mandiri sebelum diproses.
- `GET /api/v1/me/reviewables` → item pesanan selesai yang dapat diulas.
- `GET/POST /api/v1/reviews/me`, `PUT /api/v1/reviews/:id` → ulasan produk oleh pembeli.
- `GET/POST /api/v1/returns`, `GET /api/v1/returns/:id` → pengajuan dan pelacakan retur barang.
- `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`, `POST /api/v1/notifications/read` → notifikasi in-app customer.

**Publik:**
- `GET /api/v1/products/:slug/reviews` → daftar ulasan terverifikasi produk.
- `GET /api/v1/products/:slug/reviews/summary` → agregasi skor rating dan distribusi bintang.

**Admin (`/api/v1/admin`):**
- `GET /api/v1/admin/orders`, `GET /api/v1/admin/orders/:id` → manajemen pemrosesan pesanan.
- `PUT /api/v1/admin/orders/:id/status` body `{"status": "..."}` → transisi status pesanan via `orderflow`.
- `POST /api/v1/admin/orders/:id/notes` → catatan internal admin pada pesanan.
- `GET /api/v1/admin/reviews`, `PUT /api/v1/admin/reviews/:id/status`, `POST /api/v1/admin/reviews/:id/reply` → moderasi & balasan ulasan.
- `GET /api/v1/admin/returns`, `GET /api/v1/admin/returns/:id`, `PUT /api/v1/admin/returns/:id/status` → verifikasi retur pelanggan.
- `POST /api/v1/admin/orders/:id/refunds` → eksekusi pengembalian dana & restock ledger.

**Internal:**
- `GET /api/v1/internal/orders/status?order_id=&email=` → header `X-Internal-Key`; integrasi webhook n8n chatbot.

### 6.5 Integrasi Checkout v2 (`/api/v1`)
**Authed:**
- `POST /api/v1/checkout/quote` body `{"items": [...], "address_id": "...", "shipping_method_id": "...", "coupon_code": "..."}` → kalkulasi deterministik subtotal, ongkir berbobot, dan diskon kupon.
- `POST /api/v1/orders` v2 body `{"items": [...], "address_id": "...", "shipping_method_id": "...", "coupon_code": "...", "notes": "..."}` → membuat order v2, reservasi stok via `InventoryLedger`, kunci kupon via `DiscountApplier`, buat payment attempt & token Snap Midtrans.

**Webhook Midtrans:**
- `POST /api/v1/payments/midtrans/notification` → verifikasi signature SHA-512, transisi state order via `orderflow.Transition`, rollback stok/kupon otomatis saat order dibatalkan/kadaluarsa, commit kupon saat transaksi `settlement`/`capture`.

### 6.6 FastAPI AI (`/ai/v1`)
- `GET /ai/v1/search?q=&limit=12` → `{"data": [{"product_id", "slug", "name", "price_min", "thumbnail_url", "score"}], "meta": {"mode": "semantic" | "keyword_fallback"}}`
- `GET /ai/v1/products/{id}/similar?limit=6` → produk serupa tanpa produk query.
- `POST /ai/v1/embed` body `{"texts": ["..."]}` → `{"data": {"embeddings": [[768 float]]}}` — header `X-Internal-Key`.

### 6.7 Chatbot n8n
- `POST {NEXT_PUBLIC_CHAT_WEBHOOK_URL}` body `{"session_id", "message", "user": {"email": "..." | null}}` → `{"reply", "sources": [...]}`

## 7. Skema Database & Kepemilikan Migrasi

Folder tunggal `supabase/migrations`, penamaan `NNN_deskripsi.sql` berurutan (001 s.d. 013).

### 7.1 Ringkasan Migrasi (001 s.d. 013)
- `001_commerce_core.sql`: Fondasi profil, kategori, produk, varian, gambar, panduan perakitan.
- `002_orders.sql`: Keranjang (`carts`), pesanan (`orders`), item pesanan (`order_items`), pembayaran (`payments`).
- `003_automation_indexes.sql`: Index n8n-writable (`carts.followed_up_at`, `orders.reminded_at`).
- `004_vector.sql`: Tabel `documents`, pgvector HNSW index, RPC `match_documents`.
- `005_profile_fields.sql`: Kolom data diri & alamat default di tabel `profiles`.
- `006_admin_storage.sql`: Kebijakan RLS storage Supabase bucket `products` untuk admin.
- `007_i18n_content.sql`: Kolom lokalisasi dwibahasa JSONB `*_i18n` pada produk, kategori, varian, gambar.
- `008_core_v2.sql`: State machine pesanan v2, tabel `payment_attempts`, RLS & index tracking.
- `009_catalog_inventory.sql`: Kategori hirarkis (`parent_id`, ltree `path`), tag (`tags`, `product_tags`), atribut facet (`attributes`, `attribute_terms`, `product_attribute_terms`), relasi produk (`product_relations`), ledger mutasi stok (`stock_movements`), audit rating & sales trigger, constraint harga sale terjadwal.
- `010_customer_checkout.sql`: Buku alamat (`addresses`), keranjang relasional (`cart_items`), wishlist (`wishlist_items`), referensi wilayah (`provinces`), tabel ongkir berbobot (`shipping_zones`, `shipping_rates`, `shipping_methods`), pengaturan toko (`store_settings`).
- `011_promotions.sql`: Mesin promosi (`coupons`, `coupon_redemptions`), audit batas pakai per kupon/user.
- `012_aftersales.sql`: Audit event pesanan (`order_events`), catatan pesanan (`order_notes`), ulasan produk (`product_reviews`), pengajuan retur (`return_requests`), pengembalian dana (`refunds`), notifikasi pengguna (`notifications`), sinkronisasi rating produk otomatis.
- `013_v2_indexes.sql`: 13 index optimasi performa komposit & partial hasil EXPLAIN ANALYZE (Domain A, B, C) serta pembersihan skema (drop kolom usang `carts.items`).

### 7.2 Kepemilikan Tabel per Domain
- **Core / Platform:** `profiles`, `payments`, `payment_attempts`, `documents` (AI).
- **Domain A (Katalog):** `categories`, `products`, `product_variants`, `product_images`, `assembly_guides`, `tags`, `product_tags`, `attributes`, `attribute_terms`, `product_attribute_terms`, `product_relations`, `stock_movements`.
- **Domain B (Customer & Checkout):** `addresses`, `carts`, `cart_items`, `wishlist_items`, `provinces`, `shipping_zones`, `shipping_rates`, `shipping_methods`, `store_settings`.
- **Domain C (Promo & Laporan):** `coupons`, `coupon_redemptions`.
- **Domain D (Aftersales):** `orders`, `order_items`, `order_events`, `order_notes`, `product_reviews`, `return_requests`, `refunds`, `notifications`.

## 8. Cara kerja (trunk-based + teritori)

- Branch utama: `main`. Branch task berumur < 1 hari boleh, langsung merge. Branch panjang DILARANG.
- **Ritual sesi:** `git pull` → kerjakan satu task → build & test hijau → commit `"[fe|be|ai] deskripsi singkat"` → push → tambah satu baris di Log file agent-mu → **tulis ringkasan sesi di `docs/state/`** (lihat 8.1).
- QA boleh jalan paralel untuk memvalidasi hasil task yang sudah siap diuji; QA tidak mengambil alih implementasi.
- Paralel sungguhan: satu working copy per agent (`git worktree`). Dua agent dalam satu folder kerja = dilarang.

### 8.1 Ringkasan sesi (`docs/state/`) — WAJIB tiap sesi

Setiap agent (termasuk QA dan DevSecOps) menutup sesi dengan menulis **satu file baru** di `docs/state/`, agar sesi berikutnya (agent lain atau dirimu sendiri) langsung mengenali konteks tanpa membaca ulang seluruh Log.

- Nama file: `docs/state/YYYY-MM-DD-<agent>-<slug-singkat>.md` (contoh: `docs/state/2026-07-14-fe-i18n-kategori.md`). Jangan menimpa file sesi sebelumnya — selalu file baru.
- Isi minimal:
  - **Task**: apa yang dikerjakan sesi ini (satu task, sesuai Bagian 0).
  - **Status**: selesai / sebagian / diblokir — dan kenapa.
  - **Fitur/bug dicatat**: fitur baru yang jadi, bug yang ditemukan atau diperbaiki, dengan lokasi file:baris bila relevan.
  - **Permintaan lintas-teritori** (bila ada): ringkas apa yang diajukan dan ke siapa.
  - **Next**: task berikutnya yang disarankan untuk sesi selanjutnya di teritori ini.
- File ini pelengkap Log di file agent (`docs/agents/AGENT-*.md`), bukan pengganti — Log tetap satu baris ringkas per sesi; `docs/state/` boleh lebih panjang/naratif.
- Pengecualian kepemilikan `docs/`: menulis di `docs/state/` **tidak butuh** sesi yang diawasi Satria (sama seperti pengecualian `docs/devops/*.md` di Bagian 3), karena ini bagian dari ritual sesi wajib, bukan perubahan kontrak.
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

Demo criteria per milestone: lihat `docs/PRD.md` Bagian 6 (lihat catatan gap di Bagian 3 — file ini belum ada).

**Track paralel — DevSecOps (D0–D5, tidak sekuensial dengan M0–M7):** D0 Fondasi CI · D1 Provisioning & cluster · D2 CD otomatis · D3 Observability · D4 Alerting · D5 Dokumentasi & demo. Detail task per tahap: `docs/agents/AGENT-DEVSECOPS.md`. Kematangan D2+ baru relevan setelah ada aplikasi nyata untuk di-deploy (M1–M2 selesai).

## 10. Larangan global

Jangan commit `.env`/secret/`node_modules`/venv. Jangan ubah file milik Satria (master, compose, .env.example) tanpa sesi yang diawasi. Jangan menambah dependency besar atau mengganti library inti tanpa persetujuan. Jangan menulis di teritori agent lain. Jangan membuat mock/fixture yang menyimpang dari kontrak. Jangan memakai nama produk IKEA atau brand nyata. Jangan menaruh API key di kode. Jangan pakai `AutoMigrate` — semua perubahan skema lewat file migrasi. Jangan memakai `any` / `interface{}` / `typing.Any` sebagai jalan pintas tipe, dan jangan mematikan aturan lint yang menjaganya (`eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `# type: ignore`) tanpa persetujuan Satria — lihat Bagian 5.

## 11. Setup Claude Code

Isi `CLAUDE.md` di root repo:

```
Proyek KRIYA (e-commerce furniture + AI). WAJIB baca docs/agents/KRIYA-MASTER.md
sebelum melakukan apa pun. Peranmu ditentukan di awal sesi:
FE -> baca docs/agents/AGENT-FE.md · BE -> baca docs/agents/AGENT-BE.md · AI/data -> baca docs/agents/AGENT-AI.md.
QA -> baca docs/agents/AGENT-QA.md · DevSecOps -> baca docs/agents/AGENT-DEVSECOPS.md.
Patuhi teritori, kontrak, dan ritual sesi di docs/agents/KRIYA-MASTER.md.
Kerjakan hanya SATU task per sesi. Jika butuh perubahan di luar
teritorimu: berhenti dan tulis di "Permintaan lintas-teritori".
TIPE DATA WAJIB EKSPLISIT: `any` (TS), `interface{}` (Go), `typing.Any`
(Python) DILARANG — lihat docs/agents/KRIYA-MASTER.md Bagian 5. Dilarang juga
membungkam lint/type checker (`as any`, `@ts-ignore`, `eslint-disable`,
`# type: ignore`). Tipe terasa mustahil dibuat? Itu masalah kontrak:
berhenti dan ajukan lintas-teritori.
WAJIB tutup sesi dengan menulis ringkasan di docs/state/ (lihat
docs/agents/KRIYA-MASTER.md Bagian 8.1) agar sesi berikutnya mengenali
konteks fitur/bug yang sudah dicatat.
```
## Addendum (EC-v2 G0)
- Kontrak API: Lihat docs/rencana/RENCANA-ECOMMERCE-V2.md Bagian 7. Kontrak di Bagian 6 KRIYA-MASTER.md sudah digantikan oleh spesifikasi EC-v2.
- Skema Database: Lihat docs/rencana/RENCANA-ECOMMERCE-V2.md Bagian 5.6. Skema di Bagian 7 KRIYA-MASTER.md telah dimutakhirkan.
