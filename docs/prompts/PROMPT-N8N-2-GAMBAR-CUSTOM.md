# Prompt n8n — Bagian 2: Gambar furniture custom (lanjutan RAG)

> Fitur lanjutan setelah chatbot RAG (`docs/prompts/PROMPT-N8N-1-CHATBOT-RAG.md`) jadi.
> Menambahkan kemampuan: user mendeskripsikan furniture custom → n8n memanggil
> **Gemini image API (via 9router)** → simpan gambar di Supabase Storage → catat di
> `custom_requests` → balas ke widget dengan URL gambar.
>
> **Kerjakan setelah Bagian 1 hijau.** Prompt di bawah adalah **modifikasi** workflow
> chatbot yang sudah ada — buka workflow itu dulu di n8n sebelum paste.
>
> Sumber rencana: `docs/rencana/RENCANA-CHATBOT-AI.md` (Fase 2 & 4). Pemilik keputusan: **Satria.**
> Ganti semua nilai `<...>` sesuai environment sebelum dipakai.

---

## 1. Prasyarat (n8n builder tidak bisa membuat ini)

### 1a. Tabel jejak request + bucket Storage

Belum ada di repo — buat via Supabase SQL editor, jadikan bagian migrasi `008` (Fase 2).
Seluruh kolom `custom_requests` ditandai **n8n-writable** (n8n insert langsung):

```sql
create table if not exists custom_requests (
  id uuid primary key default gen_random_uuid(),
  session_id text,
  user_id uuid references profiles(id),
  prompt text not null,
  image_path text,
  image_url  text,
  status text not null default 'done',
  created_at timestamptz not null default now()
);

-- Bucket gambar hasil Gemini (publik-baca)
insert into storage.buckets (id, name, public)
values ('custom-designs','custom-designs', true)
on conflict (id) do nothing;
```

### 1b. Credentials tambahan di n8n

- **9router image** (Gemini image) — base URL + API key untuk HTTP Request.
- **Supabase service-role key** — untuk upload Storage + insert `custom_requests`
  (jangan simpan key ini di workflow JSON; taruh di credential n8n).

### 1c. Frontend (teritori AGENT-FE, di luar n8n)

`apps/web/components/kriya/chat-widget.tsx` saat ini hanya me-render `reply` + `sources`.
Agar gambar tampil, widget harus me-render pesan bot yang punya `image_url` sebagai
`<img>` + state "sedang membuat gambar…". Selama FE belum diperbarui, `reply` tetap
muncul (teks deskripsi), hanya gambarnya yang belum kelihatan.

---

## 2. Prompt untuk di-paste ke n8n (modifikasi workflow chatbot)

Ganti `<NINEROUTER_IMAGE_URL>`, `<MODEL_GEMINI_IMAGE>`, `<SUPABASE_URL>`.

```text
Modifikasi workflow chatbot KRIYA yang sudah ada (webhook -> AI Agent -> Respond to Webhook). Tambahkan kemampuan membuat gambar furniture custom. Jangan hapus tool RAG yang sudah ada. Semua field JSON snake_case.

PERUBAHAN OUTPUT PARSER
- Ubah Structured Output Parser AI Agent agar output akhir menjadi JSON persis:
  { "reply": string,
    "sources": [ { "type": "product"|"guide"|"faq"|"policy", "ref": string } ],
    "image_url": string | null,
    "kind": "answer" | "custom_render" }
- Untuk jawaban teks biasa: image_url = null, kind = "answer".
- Untuk hasil gambar custom: image_url = URL gambar, kind = "custom_render".

TAMBAHAN SYSTEM PROMPT AGENT (append ke prompt yang sudah ada):
"Jika user meminta desain/furniture custom (mendeskripsikan jenis, gaya, material, warna, atau ukuran furniture yang ingin dibuat), panggil tool buat_gambar_custom dengan deskripsi lengkapnya. Setelah dapat URL, set image_url ke URL itu dan kind='custom_render', serta beri reply deskripsi singkat gambar. Selain permintaan seperti ini, image_url=null dan kind='answer'."

TOOL BARU untuk AI Agent: "buat_gambar_custom"
- Deskripsi tool: "Buat gambar furniture custom dari deskripsi user. Param: deskripsi (string)."
- Implementasikan sebagai sub-workflow (Tool Workflow) yang dipanggil agent, isi langkah berurutan:
  a) HTTP Request POST ke 9router image endpoint <NINEROUTER_IMAGE_URL>, model "<MODEL_GEMINI_IMAGE>". Body prompt = deskripsi furniture yang dirapikan (sebut jenis, gaya, material, warna, ukuran; latar studio polos, pencahayaan bersih). Respons berupa gambar base64.
  b) Convert base64 -> binary (node "Convert to File" / pindahkan base64 ke properti binary).
  c) HTTP Request upload ke Supabase Storage:
     POST <SUPABASE_URL>/storage/v1/object/custom-designs/{{ $json.session_id }}-{{ $now.toMillis() }}.png
     Header Authorization: Bearer <credential Supabase service-role key>, Content-Type: image/png, kirim data binary.
     Simpan path objek (mis. custom-designs/<session_id>-<ts>.png) sebagai image_path.
  d) Susun public URL: <SUPABASE_URL>/storage/v1/object/public/custom-designs/<file yang sama>.
  e) Node Postgres INSERT ke custom_requests (session_id, prompt = deskripsi, image_path, image_url, status='done'). session_id diambil dari body webhook.
  f) Return ke agent: string berisi image_url publik.

RESPONS AKHIR
- Node "Respond to Webhook" tetap membalas JSON dari output parser (kini termasuk image_url + kind).
- Pertahankan header CORS yang sudah ada (Access-Control-Allow-Origin, Methods, Headers) dan penanganan preflight OPTIONS.
```

---

## 3. Setelah di-generate

- **Bagian paling rawan** = tool `buat_gambar_custom`. Builder sering hanya membuat
  skeleton; verifikasi manual rantai: HTTP 9router → base64→binary → upload Storage →
  insert `custom_requests` → return URL. Perbaiki wiring bila perlu.
- **Bentuk API 9router image** (endpoint, body, letak base64 di respons) tergantung
  gateway — sesuaikan node HTTP-nya. Nama model Gemini image masih "keputusan terbuka".
- **Jangan** simpan base64 mentah di DB — hanya `image_path`/`image_url` (URL Storage).
- Latensi image gen beberapa detik → pastikan widget FE punya indikator loading (Bagian 1c).

## 4. Verifikasi cepat

- Dari widget/POST webhook: "buatkan meja kerja custom kayu jati 100cm warna natural"
  → respons `kind":"custom_render"` + `image_url` valid (bisa dibuka di browser).
- Baris baru muncul di tabel `custom_requests` (prompt + image_path + image_url + session_id).
- Objek gambar ada di bucket `custom-designs`.
- Pertanyaan biasa (non-custom) tetap `kind":"answer"`, `image_url":null` — RAG Bagian 1 tidak rusak.
