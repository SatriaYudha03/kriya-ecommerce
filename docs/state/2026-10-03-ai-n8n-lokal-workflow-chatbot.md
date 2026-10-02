# 2026-10-03 — AI: n8n lokal + workflow chatbot (Fase 4)

**Task:** pasang n8n lokal dan susun workflow chatbot (RENCANA-CHATBOT-AI.md Fase 4).

**Status:** workflow berjalan end-to-end secara lokal dan lolos tes curl manual. Eval 25 soal
(`data/eval/chatbot_eval.jsonl`) dan integrasi FE (Fase 5) belum dikerjakan.

## Dikerjakan
- `docker-compose.yml`: `n8n` 2.41.6 (bind `127.0.0.1:5678`, data `automation/n8n/data` gitignored,
  `N8N_ENCRYPTION_KEY` wajib dari `.env`) + service baru `llm-proxy`.
- `automation/llm-proxy/server.mjs`: **9router membalas SSE bila body tanpa `stream`**, klien OpenAI n8n
  mengharapkan JSON → error `Cannot read properties of undefined (reading 'map')`. Proxy memaksa
  `stream:false`. Kredensial OpenAI di n8n memakai Base URL `http://llm-proxy:20128/v1`.
- Role DB `n8n_chat` diberi password, login terverifikasi (baca `products`/`kb_articles` OK, `orders` ditolak).
  Password lemah pilihan Satria — **ganti sebelum dipakai di luar lokal.**
- `automation/n8n/chatbot.json` (20 node) + `chat_usage_cleanup.json`; prompt di `data/prompts/chatbot_system.md`.
  Model: combo 9router `ag-gemini-low` (MiMo `mmf/mimo-auto` ditolak 9router: "Unsupported model").
- Kredensial n8n: Postgres (SSL require + ignore SSL issues), OpenAI→llm-proxy, JWT HS256, Header Auth
  `X-Internal-Key`. `INTERNAL_API_KEY` di `.env` diisi acak (API Gin harus dijalankan ulang agar memakainya).

## Temuan teknis (jangan diulang)
- Agent node harus v3.1 (v2.2 tak mendukung Chat Model 1.3). Matikan "Use Responses API" di Chat Model.
- `toolHttpRequest` gagal di 2.41.6 ("supplyData but no execute") → pakai `n8n-nodes-base.httpRequestTool`.
- Webhook OPTIONS ditangani n8n sendiri lewat opsi `allowedOrigins` (jangan buat webhook OPTIONS terpisah).
- n8n di Docker: ke host pakai `host.docker.internal`, bukan `localhost`.
- Tanpa reverse proxy, semua tamu berbagi bucket `ip:unknown` (n8n tak menerima X-Forwarded-For dari klien langsung)
  → rate limit per-IP baru bermakna di belakang proxy (permintaan DevSecOps, lihat rencana Fase 4 poin 4).

## Lolos tes curl
Harga/produk, retur (ID & EN), custom (jujur belum tersedia), prompt injection, di luar cakupan,
status pesanan (tamu benar/salah, login dengan email dari JWT, penyerang tidak bisa memakai email korban),
rate limit pesan ke-21, 400 body invalid, preflight CORS, fallback bila LLM gagal.

## Next
1. Ekspor ulang workflow dari UI bila diubah manual (sumber kebenaran sementara: `chatbot.json`).
2. Eval 25 soal + ambang lulus; 3. Fase 5 (hapus mock `localhost:5678` di `chat-widget.tsx`);
4. Ganti password `n8n_chat`; buat API key 9router baru (key lama tertempel di chat sesi ini).

## Tambahan: Fase 5 (FE) — dikerjakan atas izin eksplisit Satria di sesi yang sama
- `apps/web/components/kriya/chat-widget.tsx`: mock `localhost:5678` dihapus (mock hanya bila env kosong);
  kirim `Authorization: Bearer <access_token>` (sesi supabase-js) + `locale`; berhenti kirim `user.email`;
  `session_id` = `crypto.randomUUID()`; timeout 30 s (AbortController); `maxLength` 1000.
- i18n `chat.empty` baru (id/en); `chat.offline` diperbarui. tsc + eslint hijau.
- `apps/web/.env` & `.env.local` (gitignored): `NEXT_PUBLIC_CHAT_WEBHOOK_URL` dikoreksi dari `/webhook/chat`
  ke `/webhook/kriya-chat`. **Dev server Next harus di-restart** agar env baru terbaca.
- Belum diverifikasi di browser: header Authorization saat login, ganti bahasa ke EN.

## Tambahan: tool `urutkan_produk` + aturan popularitas (temuan dari uji di widget)
- Bug: "produk termahal" salah (LOKA dresser Rp4,8jt; yang benar Marble Top Dining Table Rp6,5jt) karena agent
  hanya punya `cari_produk` (kata kunci, LIMIT 8) dan menyimpulkan termahal dari 8 baris acak.
  Fix: tool `urutkan_produk` (sort price_desc/price_asc/newest, category, min/max price) mengurutkan SELURUH katalog
  di SQL; prompt mewajibkannya + "baris pertama = jawaban". Setelah restart n8n tunggu ±30 s sebelum curl.
- Halusinasi "Popular products" (EN) ditutup: prompt melarang menyebut populer/terlaris/terbaik (tidak ada data).
- **Data:** `products.total_sales` = 0 untuk semua 144 produk terbit meski order ratusan. Trigger
  `trg_orders_total_sales` ada & aktif, tapi hanya menaikkan saat status berubah `pending_payment → paid` dan
  tidak ada backfill → order hasil seed/insert langsung tidak terhitung. Belum diverifikasi ke tabel `orders`
  (role `n8n_chat` tak boleh baca) dan belum ada backfill (perubahan data = keputusan Satria/BE).
- Seed berisi produk bernama kembar (mis. "King Size Oak Bed" ×3, slug `product-...-<hash>`) — perlu dibersihkan.

## Pembersihan produk kembar (atas izin Satria, 2026-10-03)
- 25 nama × 3 produk seed (2026-10-02, 0 pernah dipesan). 50 duplikat di-**archive** (bukan dihapus: ulasan/wishlist ikut CASCADE bila dihapus); yang dipertahankan per nama = paling banyak ulasan+wishlist, lalu paling awal. Published 144 -> 94, nama kembar published = 0. Pulihkan dengan `UPDATE products SET status='published' WHERE status='archived'` (hanya yang diarsipkan hari ini).
- Backfill `total_sales` BELUM dilakukan: harusnya 129 unit (order processing/shipped/completed), tercatat 0.

### Update: 50 duplikat DIHAPUS (bukan hanya diarsipkan), atas perintah eksplisit Satria
- Cascade ikut menghapus: 50 varian, 50 baris product_images, 1 ulasan. 11 baris `order_items` (11 pesanan: 5 cancelled, 5 pending_payment, 1 processing) merujuk varian duplikat dengan FK RESTRICT -> **diarahkan ke varian produk kembar yang dipertahankan** (nama & harga sama), bukan dihapus; riwayat pesanan utuh.
- Sesudah: 94 produk (semua published), nama kembar 0. File gambar di Supabase Storage tidak ikut terhapus (hanya barisnya). Perubahan ini tidak bisa dipulihkan (tak ada backup); catatan 'archive' di atas sudah tidak berlaku.

## Eval 25 soal + backfill total_sales (2026-10-03)
- `data/eval/chatbot_eval.jsonl` + `data/eval/run_eval.mjs` (hasil terakhir di `data/eval/results/last-run.json`).
  Dua run berturut-turut (sebelum & sesudah aturan FORMAT di prompt): **25/25 lulus, 0 gagal kritis** (ambang >=20/25 & 0 kritis terpenuhi).
  Keterbatasan: 1 run/soal, model gratis tidak deterministik; tak ada produk diskon & tak ada panduan rakit produk terbit (tak teruji).
- Backfill `products.total_sales` (atas izin Satria): 130 unit / 30 produk, dihitung dari order paid/processing/shipped/completed.
  Temuan: 62 dari 66 `order_items` paid-like punya `product_id` NULL (seed/legacy); tautan andal = `variant_id`. Backfill memakai
  `COALESCE(oi.product_id, variant.product_id)`. Trigger `kriya_sync_total_sales` hanya membaca `order_items.product_id` -> aman untuk
  order baru (checkout kini mengisi product_id, `checkout/order_repo.go:199`), tapi baris legacy tak pernah terhitung bila status berubah lagi.
- UI widget: baris baru dipertahankan, chip sumber produk menjadi tautan ke `/products/<slug>`.
- Belum: chatbot belum memakai `total_sales` (prompt masih melarang klaim "terlaris"); bisa ditambah `sort=best_selling` di `urutkan_produk`.
