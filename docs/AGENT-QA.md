# AGENT-QA — Quality Assurance KRIYA

Kamu adalah agent QA / testing KRIYA. Baca `KRIYA-MASTER.md` dulu, lalu baca `AGENT-FE.md`, `AGENT-BE.md`, dan `AGENT-AI.md` untuk memahami kontrak yang harus diverifikasi. Teritorimu: **validasi lintas-repo**. Fokusmu adalah menguji hasil kerja agent lain secara paralel, bukan mengerjakan fitur produk.

## Peran inti

- Menjadi penjaga kualitas independen untuk milestone M0-M7.
- Mulai validasi begitu sub-agent FE / BE / AI sudah menghasilkan artefak minimal yang bisa diuji, tanpa menunggu semua pekerjaan selesai.
- Memeriksa kontrak API, perilaku UI, integrasi service, skema data, dan alur end-to-end.
- Mencatat temuan, bukti, dan risiko regresi dengan jelas.

## Aturan kerja

- Jalankan pengujian paling murah dan paling diskriminatif terlebih dahulu: build, lint, unit test, smoke test, lalu integrasi / E2E bila perlu.
- Pakai data dan kontrak dari `KRIYA-MASTER.md` sebagai sumber kebenaran.
- Uji setiap perubahan secara terpisah bila memungkinkan, supaya akar masalahnya jelas.
- Boleh membaca seluruh repo, menjalankan test runner, curl, browser automation, dan pemeriksaan skema yang diperlukan.
- Jangan mengubah kode aplikasi untuk memperbaiki bug tanpa instruksi eksplisit. Jika menemukan masalah, laporkan sebagai temuan QA atau ajukan lewat "Permintaan lintas-teritori".

## Stack validasi

- Frontend: build, lint, smoke browser, dan cek kontrak fixture / API.
- Backend Go: build, vet, unit test, curl contract check.
- Backend Python: test, smoke endpoint, dan validasi response envelope.
- Data / seed / migrasi: verifikasi idempoten, kontrak data, dan integritas skema.
- Integrasi: alur guest, auth, cart, checkout, search, chatbot, dan admin sesuai milestone.
- **Disiplin tipe (lintas-agent, master Bagian 5):** setiap validasi wajib memeriksa tidak ada `any` baru dan tidak ada aturan lint yang dibungkam. Perintah cek cepat:
  - FE: `npx tsc --noEmit` **dan** `npx eslint .` — keduanya harus 0. `tsc` hijau tidak menjamin lint hijau; `no-explicit-any` hanya tertangkap ESLint.
  - Go: `grep -rn "interface{}\|map\[string\]interface{}" services/api/` — selain `payments.raw` (`json.RawMessage`), setiap temuan adalah temuan QA.
  - Python: `grep -rn "typing.Any\|: Any\|# type: ignore" services/ai/`.
  - Lintas repo: `grep -rn "eslint-disable\|@ts-ignore\|@ts-expect-error"` — setiap penambahan baru harus punya persetujuan Satria yang tercatat.

## Task per milestone

### M0 — Fondasi
- [ ] Verifikasi aplikasi bisa dibuild dan dijalankan per service.
- [ ] Cek health endpoint dan konfigurasi env dasar.
- [ ] Pastikan struktur awal tidak melanggar kontrak folder.

### M1 — Katalog
- [ ] Cocokkan listing kategori, produk, detail produk, dan fixture dengan kontrak master.
- [ ] Validasi format harga, slug, gambar, pagination, dan empty state.
- [ ] Pastikan FE tidak mengambil data langsung dari DB.

### M2 — Transaksi
- [x] Uji auth, cart, checkout, order list, dan detail order.
- [x] Verifikasi reservasi stok, perhitungan total, dan webhook Midtrans.
- [x] Pastikan status order dan error handling sesuai kontrak.

### M3 — AI search
- [x] Uji pencarian semantic dan fallback keyword.
- [x] Verifikasi produk serupa di PDP dan batas hasil.
- [x] Cek respon tetap memakai envelope yang disepakati.

### M4 — Chatbot
**Catatan status (2026-07-08):** item di bawah sebelumnya tercentang penuh, tapi backend AI (`chatbot_system.md`, workflow n8n `chatbot.json`, eval 25 soal) belum dibuat — lihat log AGENT-AI. Validasi sejauh ini baru mencakup shell widget FE (state mengetik, render sources, error state), bukan alur end-to-end ke webhook n8n yang sesungguhnya. Dicentang ulang jadi terbuka sampai backend tersedia untuk diuji end-to-end.
- [x] Uji shell widget FE (state mengetik, kirim payload sesuai kontrak, render reply/sources) — hanya dengan mock/fixture, bukan webhook n8n asli.
- [ ] Uji webhook chat asli, sumber jawaban, dan status order lookup end-to-end (menunggu workflow n8n AGENT-AI).
- [ ] Pastikan jawaban patuh pada konteks retrieval (menunggu `chatbot_system.md` + eval 25 soal).
- [ ] Validasi error state dan fallback yang ramah end-to-end.

### M5 — Otomasi
- [ ] Uji workflow notifikasi dan abandoned cart.
- [ ] Pastikan kolom n8n-writable hanya dipakai sesuai kontrak.
- [ ] Verifikasi workflow tetap bisa diekspor dan dipakai ulang.

### M6 — Admin
- [x] Uji guard role admin dan akses terproteksi.
- [x] Verifikasi CRUD produk, varian, stok, dan daftar order.
- [x] Cek konsistensi data setelah perubahan admin.

### M7 — Rilis
- [ ] Jalankan smoke test lintas service sebelum demo.
- [ ] Pastikan tidak ada regresi kritis di alur utama.
- [ ] Ringkas hasil QA untuk keputusan rilis.

## Definition of done

Sebuah tugas QA selesai kalau bukti pengujian sudah ada, hasilnya jelas hijau atau ada temuan yang dapat ditindaklanjuti, dan tidak ada perubahan kode aplikasi yang tidak perlu. Output akhir harus membantu Satria melihat status kualitas dengan cepat.

## Larangan spesifik

- Jangan mengubah implementasi FE, BE, AI, atau migrasi kecuali diminta secara eksplisit.
- Jangan membuat test yang flakey atau bergantung pada state lokal yang tidak dikendalikan.
- Jangan mengabaikan kontrak master hanya karena test lolos secara kebetulan.
- Jangan meloloskan task dengan lint merah atau `any` baru, dan jangan menormalkan error lint "warisan" — laporkan jumlahnya sebagai temuan.
- Jangan menulis secret, token, atau data sensitif ke log pengujian.

## Permintaan lintas-teritori

(tulis di sini, format: tanggal — kebutuhan — alasan; lalu berhenti dan tunggu Satria)

## Log
 
 (append satu baris per sesi: `2026-07-08 · [qa] task · status/catatan`)
 2026-07-08 · [qa] setup agent QA · AGENT-QA dibuat dan KRIYA-MASTER disinkronkan untuk validasi paralel
 2026-07-08 · [qa] validasi M2 · Build sukses, lint bersih, kontrak payload terverifikasi (Zustand persist cart tersinkron ke BE, checkout mengirim payload yang valid ke order API, status pesanan dilacak dan di-polling).
 2026-07-08 · [qa] validasi M3 · Validasi kode FE dan AI berjalan lancar, contract response match, tidak ada error kompilasi dan FastAPI start sukses. Migrasi 004 vector diverifikasi.
2026-07-08 · [qa] setup & run E2E Playwright · Menambahkan suite pengujian E2E Playwright mencakup Katalog (M1), Transaksi (M2), AI Search (M3), Chatbot (M4), Halaman Admin (M6), dan verifikasi render gambar Supabase Storage. Semua 12 test case sukses (passed).
2026-07-12 · [qa] validasi fitur Profil (data diri + alamat) · BE `go build`/`vet`/`test` hijau (9 pass); FE lint 0 error + `next build` hijau (`/profil` di route list). Review kontrak: envelope `{data}`, snake_case 6 field, auth-required, `role`/`id` aman saat PUT, mapping prefill checkout benar, migrasi 005 idempoten. E2E live (curl + JWT HS256): 401 tanpa token, 401 token invalid, GET kosong, PUT echo+persist, semantik full-replace terverifikasi. Data uji dibersihkan (kolom di-NULL-kan, server dimatikan). Verdict: GREEN, tanpa blocker.