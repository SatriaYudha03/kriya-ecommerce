# Prompt n8n — Bagian 1: Chatbot RAG (tanpa vektor)

> Prompt siap-paste untuk **AI workflow builder n8n**. Membangun chatbot KRIYA yang
> menjawab pertanyaan dari data Supabase (produk, panduan rakit, FAQ/kebijakan, status
> pesanan) **tanpa vector DB** — cukup query terstruktur + full-text index.
>
> Bagian ini **hanya RAG (tanya-jawab)**. Fitur generate gambar furniture custom ada
> di file lanjutan: `docs/PROMPT-N8N-2-GAMBAR-CUSTOM.md`.
>
> Sumber rencana: `docs/RENCANA-CHATBOT-AI.md` (Fase 2 & 3). Pemilik keputusan: **Satria.**
> Ganti semua nilai `<...>` sesuai environment sebelum dipakai.

---

## 1. Prasyarat (n8n builder tidak bisa membuat ini)

### 1a. Tabel KB + index full-text

Tabel `kb_articles` belum ada di repo (migrasi baru sampai `007`). Buat via Supabase SQL
editor — jadikan migrasi `008` sesuai rencana Fase 2 (jangan pakai `AutoMigrate`):

```sql
create table if not exists kb_articles (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('faq','policy','guide')),
  ref  text not null,
  title text not null,
  body  text not null,
  tags  text[] default '{}',
  tsv tsvector generated always as
      (to_tsvector('simple', coalesce(title,'')||' '||coalesce(body,''))) stored,
  created_at timestamptz not null default now()
);
create index if not exists idx_kb_tsv on kb_articles using gin(tsv);
```

Isi `kb_articles` dari `data/kb/faq.md`, `data/kb/policies.md`, `data/kb/guides/*.md`
(KB loader, rencana Fase 3). **Tanpa isi, tool `cari_kb` akan kosong.**

### 1b. Credentials di n8n

- **Postgres** (Supabase) — untuk tool baca data.
- **OpenAI-compatible** → 9router (MiMo). Isi base URL + API key.
- **Header Auth** `X-Internal-Key` = nilai `INTERNAL_API_KEY` — untuk tool status pesanan.

### 1c. Catatan jaringan

Base URL API Gin dari dalam container n8n memakai nama service Docker
(`http://api:8080`) atau `http://host.docker.internal:8080` — **bukan** `localhost`.

---

## 2. Prompt untuk di-paste ke n8n

Ganti `<NINEROUTER_BASE_URL>`, `<MODEL_MIMO>`, `<API_BASE_URL>`, `<WEB_ORIGIN>`.

```text
Buatkan satu workflow n8n untuk chatbot e-commerce furniture "KRIYA" (bahasa utama: Indonesia). Chatbot menjawab pertanyaan user dengan RAG dari Postgres (TANPA vector DB), memakai query terstruktur + full-text. Semua field JSON snake_case.

TRIGGER
- Node "Webhook", method POST, path "kriya-chat", responseMode = "Using 'Respond to Webhook' node".
- Body masuk: { "session_id": string, "message": string, "user": { "email": string } | null }.

AI AGENT (inti)
- Node "AI Agent" (tools agent), input teks = {{ $json.body.message }}.
- Chat Model = node "OpenAI Chat Model" memakai credential OpenAI-compatible ke 9router (base URL <NINEROUTER_BASE_URL>), model "<MODEL_MIMO>", temperature 0.3.
- Memory = "Simple Memory" (window buffer), session key = {{ $json.body.session_id }}.
- Pasang Structured Output Parser agar output akhir agent SELALU JSON persis:
  { "reply": string, "sources": [ { "type": "product"|"guide"|"faq"|"policy", "ref": string } ] }

SYSTEM PROMPT AGENT (isikan persis):
"Kamu asisten toko furniture KRIYA. Jawab natural dalam Bahasa Indonesia, ringkas dan ramah. WAJIB menjawab HANYA dari hasil tool (produk, panduan rakit, FAQ/kebijakan, status pesanan). DILARANG mengarang nama produk, harga, stok, atau tanggal pengiriman. Jika informasi tidak ada di tool, katakan tidak tahu dan tawarkan eskalasi ke CS. Selalu isi 'sources' dari ref/slug yang benar-benar kamu pakai."

TOOLS AGENT (semua read-only, credential Postgres Supabase kecuali disebut lain):

1) Tool Postgres "cari_produk" — cari produk by kata kunci/kategori/harga.
   Deskripsi tool: "Cari produk berdasarkan nama, kategori, atau kata kunci. Param: q (string)."
   Query:
   SELECT p.slug, p.name, p.category_slug, MIN(v.price) AS price_min, COALESCE(SUM(v.stock),0) AS stock_total
   FROM products p JOIN product_variants v ON v.product_id = p.id
   WHERE p.name ILIKE '%'||$1||'%' OR p.description ILIKE '%'||$1||'%' OR p.category_slug ILIKE '%'||$1||'%'
   GROUP BY p.id, p.slug, p.name, p.category_slug
   ORDER BY price_min ASC LIMIT 8;
   ($1 = parameter q dari agent)

2) Tool Postgres "detail_produk" — spesifikasi + panduan rakit by slug.
   Deskripsi: "Ambil spesifikasi lengkap, varian, dan panduan perakitan sebuah produk. Param: slug (string)."
   Query:
   SELECT p.name, p.description, p.materials, p.dimensions, p.weight_kg, p.has_assembly_guide,
          g.content_md AS assembly_guide,
          json_agg(json_build_object('sku',v.sku,'color',v.color,'size',v.size,'price',v.price,'stock',v.stock)) AS variants
   FROM products p
   JOIN product_variants v ON v.product_id = p.id
   LEFT JOIN assembly_guides g ON g.product_id = p.id
   WHERE p.slug = $1
   GROUP BY p.id, p.name, p.description, p.materials, p.dimensions, p.weight_kg, p.has_assembly_guide, g.content_md;

3) Tool Postgres "cari_kb" — FAQ/kebijakan/panduan (full-text).
   Deskripsi: "Cari jawaban FAQ, kebijakan toko, atau panduan umum. Param: q (string)."
   Query:
   SELECT type, ref, title, left(body, 800) AS excerpt
   FROM kb_articles
   WHERE tsv @@ plainto_tsquery('simple', $1)
   ORDER BY ts_rank(tsv, plainto_tsquery('simple', $1)) DESC
   LIMIT 4;

4) Tool HTTP "status_pesanan" — cek status pesanan via API internal Gin.
   Deskripsi: "Cek status pesanan. Param: order_id (string), email (string)."
   HTTP Request Tool: GET <API_BASE_URL>/api/v1/internal/orders/status?order_id={order_id}&email={email}
   Header: X-Internal-Key = credential Header-Auth INTERNAL_API_KEY.
   Jika 404, artinya pesanan tidak ditemukan untuk kombinasi order_id+email itu.

RESPONS AKHIR
- Node "Respond to Webhook", responds dengan JSON hasil Structured Output Parser agent (reply, sources).
- Tambahkan header CORS di respons: Access-Control-Allow-Origin = <WEB_ORIGIN>, Access-Control-Allow-Methods = "POST, OPTIONS", Access-Control-Allow-Headers = "Content-Type". Tangani juga preflight OPTIONS agar fetch dari browser tidak diblokir.

Catatan: 'user' pada body bisa null; jika ada, user.email dipakai untuk tool status_pesanan.
```

---

## 3. Setelah di-generate

- Attach semua credential (Bagian 1b) ke node yang sesuai.
- Sesuaikan base URL + nama model 9router (masih "keputusan terbuka" di rencana — belum dipin).
- **Kontrak respons** = `{ reply, sources }`, kompatibel dengan `chat-widget.tsx` saat ini
  (widget membaca `reply` + `sources`). Bagian 2 (gambar custom) akan menambah field
  `image_url` + `kind` ke output parser — lihat `docs/PROMPT-N8N-2-GAMBAR-CUSTOM.md`.
- **status_pesanan**: default pakai endpoint internal Gin (sudah teruji). Alternatif
  (Postgres node langsung join `auth.users`) adalah keputusan terbuka di rencana Fase 3.

## 4. Verifikasi cepat

- Kirim POST ke webhook: `{ "session_id":"t1", "message":"berapa harga meja kerja?", "user":null }` → dapat `reply` + `sources` terisi.
- Tanya panduan rakit produk tertentu → `detail_produk` terpanggil, jawaban akurat.
- Tanya status pesanan dengan order_id+email valid → status cocok DB; kombinasi salah → agent bilang tidak ketemu.
- Pertanyaan di luar cakupan → agent menolak/eskalasi, tidak mengarang.
