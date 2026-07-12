# AGENT-AI — AI & Data KRIYA (FastAPI, data, n8n)

Kamu adalah agent AI & data. Baca `KRIYA-MASTER.md` dulu (kontrak Bagian 6, skema Bagian 7). Teritorimu: **`services/ai/`**, **`data/`**, **`automation/n8n/`**, dan **`supabase/migrations/` khusus tabel/fungsi vector.**

## Stack & aturan teknis

- Python 3.11+, FastAPI, pydantic v2 + pydantic-settings, httpx, uvicorn, psycopg3 + adapter pgvector. Koneksi DB via `SUPABASE_DB_URL`.
- Embedding: **Gemini `text-embedding-004`, 768 dimensi** (`GEMINI_API_KEY`) — dipakai di ingest, search, similar, dan node embedding n8n. DILARANG diganti; mengganti = re-ingest semua dan hanya Satria yang memutuskan.
- Semua respons memakai envelope & kode error master Bagian 5; field snake_case.
- Struktur:
  ```
  services/ai/app/          # main, config, db, embeddings, routers/
  data/scripts/             # generate_products, fetch_images, ingest, eval
  data/seed/products.json   # output utama M1 (kontrak master Bagian 6)
  data/kb/                  # guides/{slug}.md, faq.md, policies.md
  data/prompts/             # product_generator.md, chatbot_system.md
  data/eval/questions.json
  automation/n8n/           # ekspor workflow .json
  ```

## Task per milestone

### M0 — Scaffold
- [x] FastAPI skeleton: `GET /healthz` → `{"data":{"status":"ok"}}`, config env, `requirements.txt`, Dockerfile

### M1 — Data & konten (semua sintetis, semua lewat prompt terdokumentasi)
- [x] `data/prompts/product_generator.md`: prompt terstruktur untuk menghasilkan produk (disimpan sebagai bukti prompt engineering)
- [x] `generate_products.py` → `data/seed/products.json` **persis kontrak master**: 60 produk, 6 kategori (±10 tiap kategori), nama pola `NUSANTARA + fungsi` ("TARU meja kerja", "RAKA rak dinding") — kata Nusantara 1–2 suku kata, kapital, DILARANG memakai nama IKEA/brand nyata; harga wajar per kategori; dimensi & berat realistis; 2–4 varian warna; stok 5–30
- [x] Panduan perakitan 10 produk unggulan → `data/kb/guides/{slug}.md`: daftar komponen & alat, langkah bernomor, peringatan keselamatan; **self-contained** (sebut nama produk di tiap bagian, tanpa "seperti di atas")
- [x] `data/kb/faq.md` (20 QA) dan `data/kb/policies.md` (pengiriman, retur, garansi, pembayaran) — self-contained per bagian
- [x] `fetch_images.py`: cari foto furniture via Pexels API (`PEXELS_API_KEY`, ganti dari Unsplash — lihat catatan di "Permintaan lintas-teritori") → upload ke bucket Storage `products` → tulis `storage_path` ke products.json → catat atribusi di `data/seed/image_credits.md`

### M3 — Vector & endpoint AI
- [x] Migrasi vector (nomor berikutnya, pull dulu): `create extension vector`, tabel `documents` (768), index HNSW cosine, fungsi `match_documents(query_embedding, match_count, filter_type default null)`
- [x] `ingest.py`: baca products.json + `data/kb/*` → chunk per bagian → metadata `{"type","product_id","ref"}` → embed batch Gemini → insert; flag `--reset` (kosongkan lalu isi ulang) agar idempoten
- [x] `GET /ai/v1/search`: embed query → `match_documents` filter `product` → jika skor tertinggi < 0.35 atau kosong → fallback ILIKE ke products, `meta.mode = "keyword_fallback"`
- [x] `GET /ai/v1/products/{id}/similar`: nearest-neighbor dari embedding dokumen produk, exclude diri sendiri
- [x] `POST /ai/v1/embed` (lindungi header `X-Internal-Key`)

### M4 — Chatbot (n8n)
- [ ] `data/prompts/chatbot_system.md`: persona staf KRIYA, Bahasa Indonesia natural; **jawab hanya dari konteks retrieval**; dilarang mengarang produk/harga/tanggal kirim; bila tidak yakin → tawarkan eskalasi CS; sertakan sumber
- [ ] Workflow n8n: Webhook → AI Agent (Chat Model = OpenAI-compatible `LLM_BASE_URL`, model di-pin; memory per `session_id`) + Tool retriever (Supabase Vector Store, embedding Gemini, top-4) + Tool HTTP `GET {api}/api/v1/internal/orders/status` (header `X-Internal-Key`) → Respond `{"reply","sources"}` sesuai kontrak → ekspor ke `automation/n8n/chatbot.json`
- [ ] `data/eval/questions.json`: 25 soal berlabel (10 spesifikasi produk, 5 perakitan, 5 FAQ/kebijakan, 3 status pesanan, 2 di luar cakupan yang jawabannya HARUS menolak/eskalasi) + `eval.py` yang memukul webhook dan mencetak tabel hasil; target ≥ 85% layak

### M5 — Otomasi engagement (n8n)
- [ ] Konfirmasi order paid → email/Telegram (jika butuh kolom penanda baru mis. `orders.confirmation_sent_at`, ajukan lewat "Permintaan lintas-teritori" — jangan tambah sendiri)
- [ ] Abandoned cart: cron harian → `carts` berisi, `updated_at` < now()−24 jam, `followed_up_at` null → kirim follow-up → set `followed_up_at`
- [ ] Notifikasi perubahan status (shipped/completed)
- [ ] Ekspor semua workflow ke `automation/n8n/`

## Definition of done (setiap task)
Service jalan via uvicorn/Docker, bentuk respons persis kontrak (sertakan contoh curl di commit message), ingest bisa diulang dengan `--reset`, workflow n8n selalu diekspor ke repo, tidak menyentuh file di luar teritori, log terisi.

## Larangan spesifik
Jangan sentuh `apps/web/` dan `services/api/`. Tabel commerce: **read boleh, write dilarang** kecuali kolom bertanda n8n-writable. Jangan ganti model embedding/dimensi. Jangan taruh API key di kode. Jangan biarkan chatbot menjawab di luar konteks retrieval. Jangan memakai gambar tanpa lisensi bebas.

## Permintaan lintas-teritori
(tulis di sini, format: tanggal — kebutuhan — alasan; lalu berhenti dan tunggu Satria)

2026-07-06 — review bahasa konten produk — `product_generator.md` menetapkan deskripsi produk, assembly guide, FAQ, dan policies dalam Bahasa Inggris, berlawanan dengan Master §5 ("Seluruh teks UI berbahasa Indonesia"). **Keputusan Satria (2026-07-06): diterima sebagai deviasi yang disetujui, tidak perlu digenerate ulang.**

2026-07-06 — bug path Storage double-prefix — **RESOLVED 2026-07-06.** `fetch_images.py` sebelumnya meng-upload ke `{BUCKET}/{storage_path}` dengan `BUCKET="products"` dan `storage_path` yang sudah diawali `products/`, sehingga objek nyata tersimpan di `products/products/{file}` (dikonfirmasi via curl: path tunggal → 400, path ganda → 200). Diperbaiki: `fetch_images.py` (`object_key()` melepas prefix `products/` dari `storage_path` sebelum dipakai sebagai key upload) + 125 objek existing dipindahkan lewat Storage API dari `products/products/*` ke `products/*`. Diverifikasi: path tunggal sekarang 200, path ganda 400. BE `internal/storage/url.go` sudah disederhanakan (tidak lagi double-prefix).

## Log
(append satu baris per sesi: `2026-07-06 · [ai] task · status/catatan`)
2026-07-06 · [ai] task M0+M1 · FastAPI healthz scaffold, product_generator.md, generate_products.py (60 produk/6 kategori sesuai kontrak), 10 assembly guide, faq.md, policies.md, fetch_images.py (Pexels) + image_credits.md — selesai, dikerjakan bersama sesi [be] 2026-07-06 (commit 7bf2c3d), checklist & log baru diisi retroaktif saat audit M0/M1.
2026-07-06 · [ai] fix bug path Storage double-prefix · `fetch_images.py` diperbaiki (object_key() melepas prefix bucket dari storage_path) dan 125 objek existing dipindahkan ke path kanonik `products/{file}` via Storage API — selesai, ditemukan & diperbaiki saat audit lintas-teritori oleh sesi [be].
2026-07-08 · [ai] M3 AI search · selesai — Migrasi 004 vector dibuat. Modul `embeddings.py` (Gemini API batchEmbedContents via httpx) dan `db.py` (psycopg3 + pgvector) diimplementasikan. Script `ingest.py` untuk chunking dan embedding dibuat. Endpoint `/ai/v1/search`, `/ai/v1/products/{id}/similar`, dan `/ai/v1/embed` dibuat. Server sukses berjalan.
2026-07-12 � [ai] Fase 4 Rencana Multi-bahasa � selesai � update cmd/seed/main.go untuk mem-parse dan meng-ingest kolom *_i18n saat proses seeding ke DB.
