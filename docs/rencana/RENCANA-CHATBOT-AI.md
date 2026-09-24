# Rencana: Pivot lapisan AI — hapus vektor/FastAPI, chatbot n8n + furniture custom

> Dokumen rencana (handoff). Disusun untuk dikerjakan oleh agent/sesi berikutnya.
> **Belum dieksekusi.** Ikuti teritori & ritual sesi di `docs/agents/KRIYA-MASTER.md`.
> Pemilik keputusan: **Satria.**

## Context

Rencana lapisan AI awal (M3–M4 di master) memakai **pencarian semantik + rekomendasi
"produk serupa" + chatbot RAG berbasis embedding**, dijalankan oleh service Python
**FastAPI** (`services/ai/`) dengan **pgvector** (Gemini `text-embedding-004`, 768-dim).

Satria memutuskan **membuang seluruh pendekatan vektor itu.** Scope AI yang baru
hanya satu fitur: **chatbot** yang

1. menjawab pertanyaan user **berdasarkan data yang sudah ada di Supabase** —
   **tanpa vector DB**, cukup query DB yang **sudah terindeks** (Postgres index /
   full-text search), dan
2. bisa menerima **request furniture custom** dari user, lalu **membuatkan gambarnya**
   memakai **Gemini image API**.

Chatbot dibangun di **n8n**, dengan **LLM utama MiMo** dan **Gemini image API**
keduanya diambil dari **9router** (gateway model milik Satria; MiMo lewat endpoint
OpenAI-compatible, Gemini image lewat HTTP).

### Keputusan pemilik (sudah dikonfirmasi)

- **Service Python FastAPI (`services/ai/`) DIHAPUS.** Seluruh isinya (search
  semantik, `/similar`, `/embed`) hanya melayani fitur vektor yang dibuang; sisanya
  cuma `healthz`. Tidak ada fungsi bernilai yang tersisa.
- **Vektor / pgvector / embedding dibuang total.** Tidak ada re-ingest.
- **Akses data agent n8n = node Postgres langsung di n8n** (bukan endpoint Gin baru).
  Kredensial Postgres untuk n8n sudah dialokasikan di master Bagian 4.
- **Retrieval jawaban = query terstruktur + full-text index** pada tabel yang sudah
  ada (`products`, `product_variants`, `assembly_guides`) + satu tabel KB baru untuk
  FAQ/kebijakan. "Cukup DB yang sudah terindeks."
- **Furniture custom**: user deskripsikan → n8n panggil Gemini image (9router) →
  simpan gambar di Supabase Storage → balas ke widget dengan URL gambar → catat
  request di tabel baru.

## Dampak: kenapa service Python tidak lagi diperlukan

Semua isi `services/ai/` melayani hal yang dibuang:

| Endpoint FastAPI | Nasib |
|---|---|
| `GET /ai/v1/search` (semantik) | ❌ dibuang |
| `GET /ai/v1/products/{id}/similar` | ❌ dibuang |
| `POST /ai/v1/embed` (Gemini embedding) | ❌ dibuang (no vektor) |
| `GET /healthz`, `/ai/v1/healthz` | trivial, tak butuh service sendiri |

Orkestrasi chat + panggilan LLM/Gemini image ada di **n8n**; baca data ada di
**Postgres (node n8n)**. Tidak ada peran tersisa untuk service Python.

## Arsitektur baru

```
User ─► Chat widget (FE, chat-widget.tsx) ─► Webhook n8n (NEXT_PUBLIC_CHAT_WEBHOOK_URL)
                                                │
   ┌────────────────────────────────────────────┤
   │                                            │
   ├─ LLM MiMo (9router, OpenAI-compatible)  →  reasoning + orkestrasi tool + jawaban
   ├─ Tool: node Postgres n8n (read-only)    →  produk, harga, stok, panduan, KB, status order
   └─ Tool: Gemini image (9router, HTTP)     →  render furniture custom
                                                │
                                                ├─► Supabase Storage (bucket gambar custom)
                                                └─► Postgres (catat custom_requests) [n8n-writable]
```

Yang tetap dipakai apa adanya: **Supabase Postgres + Auth + Storage**, **API Gin**
(commerce, tak tersentuh selain kemungkinan endpoint internal status order — lihat
Fase 3), **FE Next**, **n8n**.

---

## Fase 0 — Docs & kontrak (teritori Satria)

Semua perubahan di `docs/agents/KRIYA-MASTER.md` harus dilakukan lebih dulu oleh/di sesi yang
diawasi Satria, sebelum kode. Simpan dokumen ini ke `docs/` sebagai langkah pertama.

Edit `docs/agents/KRIYA-MASTER.md`:

1. **Bagian 2 (Stack):** hapus baris **Backend AI (FastAPI)** dan **Embedding
   (Gemini 768-dim)**. Ubah baris **LLM chatbot** → MiMo via 9router (OpenAI-compatible).
   Tambah baris **Image gen** → Gemini image via 9router.
2. **Bagian 3 (Struktur repo & teritori):** hapus `services/ai/` (TERITORI AGENT-AI
   FastAPI). Teritori AGENT-AI menyusut jadi `automation/n8n/` + `data/`. Perjelas
   bahwa AGENT-AI kini kode-nya = workflow n8n + KB/seed, bukan Python.
3. **Bagian 4 (Port & env):** hapus baris service **ai (FastAPI) port 8000**
   beserta env `GEMINI_API_KEY`/`SUPABASE_DB_URL` khusus service itu. Kredensial
   n8n bertambah: **Gemini image key** (untuk 9router). Hapus `NEXT_PUBLIC_AI_URL`
   dari daftar env `web`.
4. **Bagian 5 (Konvensi):** hapus "FastAPI `/ai/v1/...`" dari aturan prefix path.
   Perbarui catatan di endpoint produk (Bagian 6) yang menyebut "pencarian pintar
   ada di FastAPI".
5. **Bagian 6 (Kontrak API):**
   - Hapus seluruh sub-bagian **### FastAPI** (`/ai/v1/search`, `/similar`, `/embed`).
   - Pada `GET /api/v1/products`: ubah catatan `q` → keyword search Gin (ILIKE / full-text)
     adalah satu-satunya pencarian; hapus "(pencarian pintar ada di FastAPI)".
   - Sub-bagian **### Chat (M4 — n8n webhook)**: perluas bentuk respons untuk
     mendukung gambar furniture custom, mis.
     `{"reply", "sources": [...], "image_url": "<url|null>", "kind": "answer" | "custom_render"}`.
     (Bentuk final = keputusan Satria; lihat "Keputusan terbuka".)
6. **Bagian 7 (Skema & kepemilikan):**
   - Hapus blok **Milik AGENT-AI (vector)** (`documents`, `match_documents`, HNSW).
   - Tambah tabel baru (lihat Fase 2): `kb_articles` dan `custom_requests`, tandai
     kolom yang **n8n-writable** (n8n menulis `custom_requests` langsung).
7. **Bagian 9 (Roadmap):** hapus baris **M3 AI search**. Definisikan ulang **M4
   Chatbot** = webhook n8n + retrieval Postgres + status order + furniture custom
   (image gen) + eval. Sesuaikan **M5 Otomasi** jika perlu.
8. **Status milestone (header Bagian 0):** perbarui — M3 dibatalkan, M4 didefinisikan
   ulang tanpa vektor.

Sesuaikan juga `docs/agents/AGENT-AI.md` (DoD & backlog: hapus tugas vektor/ingest/FastAPI,
ganti dengan workflow n8n + KB + image gen). `docs/rencana/RENCANA-MULTIBAHASA.md` **Fase 5**
menyebut re-ingest embedding — tandai **batal** (tidak ada embedding lagi).

---

## Fase 1 — Hapus service FastAPI + bersihkan konsumennya (FE)

**Hapus** (teritori AGENT-AI):
- Direktori `services/ai/` seluruhnya (termasuk `.venv`, `app/`, `Dockerfile`,
  `requirements.txt`).
- Entri service `ai` di `docker-compose.yml` (file Satria — sesi diawasi).

**FE cleanup** (teritori AGENT-FE) — referensi yang diketahui dari grep:
- `apps/web/lib/api.ts`:
  - `searchProducts` (≈ baris 235) memanggil `/ai/v1/search` dengan `base: "ai"` →
    **arahkan ulang ke keyword search Gin** `GET /api/v1/products?q=` (`base: "api"`).
    Kembalikan bentuk list produk standar; hapus ketergantungan `SearchEnvelope`/`mode`.
  - `getSimilarProducts` (≈ baris 238–244) → **hapus**.
  - Hapus konstanta/branch `base: "ai"` dan pemakaian `NEXT_PUBLIC_AI_URL`.
- `apps/web/lib/queries.ts`: hapus `useSimilarProducts` (≈ 62–65) + importnya (baris 5).
- `apps/web/components/kriya/product-detail-view.tsx`: hapus komponen `SimilarProducts`
  (≈ 19–, dan pemanggilan di ≈ 217) + import `useSimilarProducts` (baris 8). Blok
  "Produk serupa" di PDP hilang.
- `apps/web/lib/types.ts`: hapus `SimilarEnvelope` (≈ 151) dan field `mode`
  (`"semantic" | "keyword_fallback"`, ≈ 134); sesuaikan `SearchEnvelope` bila masih
  dipakai (search kini pakai envelope list produk biasa).
- **Halaman `/search` tetap ada**, tapi sumber datanya kini keyword search Gin.
  Kotak pencarian di `site-header.tsx` (push ke `/search?q=`) tidak berubah.
- Hapus `NEXT_PUBLIC_AI_URL` dari `.env.example` (file Satria) & konfigurasi FE.

Verifikasi: `pnpm --dir apps/web build` + `tsc` strict hijau; `/search?q=` mengembalikan
hasil dari Gin; PDP tampil tanpa blok "Produk serupa"; tidak ada link/impor mati.

---

## Fase 2 — Migrasi DB: buang vektor, tambah KB & custom_requests (BERSAMA)

`git pull` dulu; nomor file = `max + 1` (saat ini tertinggi `007_i18n_content.sql`,
jadi kemungkinan `008_...`). Jangan pakai `AutoMigrate`.

1. **Drop vektor** — migrasi baru yang me-`DROP FUNCTION match_documents(...)` dan
   `DROP TABLE documents`, serta (opsional) `DROP EXTENSION IF EXISTS vector` jika
   tidak ada objek lain yang memakainya. Catatan: skema vektor dibuat di
   `supabase/migrations/004_vector.sql` — **jangan mengedit file lama**; buat migrasi
   drop terpisah agar riwayat migrasi tetap forward-only.

2. **Tabel KB `kb_articles`** untuk FAQ/kebijakan (menjawab tanpa vektor):
   `id`, `type` (`faq` | `policy` | `guide`), `slug`/`ref`, `title`, `body` (text),
   `tags text[]`. **Index full-text**: kolom generated `tsv tsvector` (mis.
   `to_tsvector('simple', title || ' ' || body)`) + **GIN index**, dan/atau `pg_trgm`
   (GIN `gin_trgm_ops`) di `title`/`body` untuk pencocokan keyword toleran typo.
   Ini realisasi "cukup DB yang sudah terindeks".
   - Sumber isi sudah tersedia di `data/kb/faq.md`, `data/kb/policies.md`, dan
     `data/kb/guides/*.md` (panduan rakit juga sudah ada di tabel `assembly_guides`).
     Butuh loader seed (lihat Fase 3, teritori AGENT-AI/BE).
   - Pastikan `products.name/description` dan `assembly_guides.content_md` juga
     ter-cover index full-text/trigram bila agent mau mencocokkan spesifikasi produk.

3. **Tabel `custom_requests`** (jejak request furniture custom):
   `id`, `session_id` (chat), `user_id` (nullable → `profiles`), `prompt` (text
   deskripsi user), `image_path`/`image_url`, `status`, `created_at`. **Seluruh
   kolom n8n-writable** (n8n insert langsung via node Postgres) — catat di master
   Bagian 7. Kepemilikan tabel = keputusan Satria (lihat "Keputusan terbuka").

4. **Supabase Storage**: bucket baru mis. `custom-designs` (publik-baca atau
   signed-URL) untuk menyimpan gambar hasil Gemini. Tambahkan policy Storage yang
   sesuai (mirip pola `006_admin_storage.sql`).

Verifikasi: migrasi ter-apply; `documents`/`match_documents` hilang; `kb_articles`
punya GIN index (`\d+ kb_articles`); query FTS contoh mengembalikan baris relevan;
bucket `custom-designs` ada.

---

## Fase 3 — Workflow chatbot n8n (teritori AGENT-AI: `automation/n8n/`, `data/`)

Buat direktori `automation/n8n/` (belum ada) dan simpan **ekspor workflow `.json`**.

**Workflow `chatbot`** — trigger Webhook (`POST`, body kontrak
`{session_id, message, user: {email|null}}`):

1. **AI Agent / LLM node → MiMo via 9router** (OpenAI-compatible base URL + model
   di-pin, tanpa fallback-chain). System prompt disimpan sebagai
   `data/prompts/chatbot_system.md` (teritori AGENT-AI).
2. **Tools (semua via node Postgres n8n, read-only):**
   - `cari_produk` — filter `products`/`product_variants` by nama/kategori/harga/stok
     (ILIKE atau FTS pada index Fase 2), kembalikan nama, harga_min, slug, stok.
   - `detail_produk` — spesifikasi + `assembly_guides.content_md` by slug.
   - `cari_kb` — FTS/trigram pada `kb_articles` (FAQ/kebijakan) → kutipan + `ref`.
   - `status_pesanan` — by `order_id` + `email`. **Rekomendasi:** untuk tool ini
     boleh **memakai endpoint internal Gin yang sudah ada**
     (`GET /api/v1/internal/orders/status`, header `X-Internal-Key`) karena logika
     join ke `auth.users` (email) sudah jadi & teruji — hemat, tak perlu ditulis
     ulang di Postgres node. (Keputusan akhir Satria; default proyek = Postgres node.)
3. **Susun jawaban** → `{"reply", "sources": [{type, ref}], "image_url": null,
   "kind": "answer"}`. `sources` diisi dari `ref` KB/produk yang dipakai.

**KB loader** (teritori AGENT-AI): script/seed yang membaca `data/kb/*.md` →
`kb_articles`. Bisa `data/scripts/load_kb.py` (arsip) yang dieksekusi lewat MCP
`execute_sql`, konsisten dengan pola `data/scripts/` yang ada.

**Eval**: `data/eval/` berisi ~25 soal + jawaban acuan (spesifikasi, panduan rakit,
kebijakan, status order) untuk mengukur akurasi chatbot tanpa vektor.

Verifikasi: kirim contoh pertanyaan ke webhook → jawaban benar + `sources` terisi;
status order cocok dengan DB; eval 25 soal lulus ambang yang disepakati.

---

## Fase 4 — Furniture custom (image gen) — n8n + FE + kontrak

**n8n** (lanjutan workflow chatbot):
1. **Deteksi intent** "request furniture custom" (klasifikasi oleh MiMo, atau tool
   khusus). Ekstrak deskripsi (jenis, gaya, material, warna, ukuran).
2. **Panggil Gemini image API via 9router** (HTTP Request node) dengan prompt yang
   dirapikan MiMo. Balikannya umumnya **base64** → decode.
3. **Upload ke Supabase Storage** bucket `custom-designs` (Storage REST API; butuh
   kredensial service — simpan di kredensial n8n, jangan di workflow JSON) → dapat
   `image_url`.
4. **Insert `custom_requests`** (prompt + image_path + session/user).
5. **Balas** `{"reply": "<deskripsi singkat>", "sources": [], "image_url": "<url>",
   "kind": "custom_render"}`.

**FE** (teritori AGENT-FE) — `apps/web/components/kriya/chat-widget.tsx`:
- Render pesan bot yang punya `image_url` sebagai **gambar** (bukan hanya teks).
- Optional: state "sedang membuat gambar…" (image gen bisa beberapa detik).
- Ikuti kontrak respons final dari Fase 0.

**Kontrak** (Fase 0 Bagian 6) harus sudah menambah `image_url`/`kind` sebelum FE & n8n.

Verifikasi: dari widget, minta "meja kerja custom kayu jati 100cm" → muncul gambar;
`custom_requests` bertambah; gambar tersimpan & URL valid.

---

## Fase 5 — QA end-to-end (teritori AGENT-QA)

- Chatbot menjawab pertanyaan spesifikasi/panduan/kebijakan dengan `sources` benar.
- Lookup status order akurat (match `order_id`+`email`; 404 jika tak cocok).
- Furniture custom menghasilkan gambar tersimpan + `custom_requests` tercatat.
- Regresi: `/search` (kini Gin keyword) tetap jalan; PDP tanpa "Produk serupa"
  tidak error; tidak ada sisa referensi `/ai/v1/*` atau `NEXT_PUBLIC_AI_URL`.
- Build hijau semua service; `docker compose up` tanpa service `ai`.

---

## Keputusan terbuka (butuh ketetapan Satria)

1. **Kepemilikan `custom_requests` & `kb_articles`** — masuk teritori AGENT-BE
   (commerce) atau AGENT-AI? Karena n8n yang menulis `custom_requests` langsung,
   perlu ditandai n8n-writable di Bagian 7 apa pun pemiliknya.
2. **Bentuk final kontrak chat** untuk gambar: `image_url` tunggal vs array
   `attachments`; perlu field `kind`/`type` pesan?
3. **Storage bucket custom**: publik-baca (URL permanen) vs signed-URL (privat,
   kedaluwarsa)? Pengaruh ke policy & cara FE me-render.
4. **status_pesanan**: pakai ulang endpoint internal Gin yang sudah ada, atau
   pindah sepenuhnya ke Postgres node (default keputusan: Postgres node)?
5. **Model & pinning di 9router**: nama model MiMo & model Gemini image yang dipakai
   (di-pin, tanpa fallback) — dicatat di kredensial n8n, bukan di kode.

## Risiko & catatan

- **Perubahan kontrak & teritori** menyentuh file milik Satria (`docs/agents/KRIYA-MASTER.md`,
  `docker-compose.yml`, `.env.example`) → wajib lewat sesi yang diawasi (Fase 0),
  baru kode.
- **Kredensial**: node Postgres n8n sebaiknya pakai **role read-only** untuk tool
  baca; hanya jalur `custom_requests` yang butuh insert. Service key Storage &
  kunci 9router hanya di kredensial n8n, tidak di workflow JSON yang di-commit.
- **Gambar base64 besar** — jangan simpan base64 mentah di DB; selalu lewat Storage,
  simpan URL/path saja.
- **Latensi image gen** beberapa detik — widget perlu indikator loading agar UX oke.
- **Hapus vektor bersifat destruktif** (drop `documents`) — pastikan benar-benar
  tak ada konsumen tersisa sebelum drop; migrasi drop tidak bisa auto-rollback data.
- **`docs/rencana/RENCANA-MULTIBAHASA.md` Fase 5** (KB/embedding bilingual) menjadi tidak relevan
  soal embedding; KB bilingual kini cukup kolom teks per-locale di `kb_articles`.
```
