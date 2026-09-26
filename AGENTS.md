Proyek KRIYA (e-commerce furniture + AI). WAJIB baca docs/agents/KRIYA-MASTER.md
sebelum melakukan apa pun. Peranmu ditentukan di prompt sesi (Agent A/B/C/D,
0A/0B/0C/0D, atau integrator I-BE/I-FE/I-QA) — lihat docs/rencana/EKSEKUSI-PARALEL-V2.md.

PROGRAM EC-v2 SEDANG BERJALAN. Selama program ini, EKSEKUSI-PARALEL-V2.md
MENGGANTIKAN Bagian 3 & 8 KRIYA-MASTER.md untuk teritori dan ritual sesi.

LANGKAH 0 WAJIB, SEBELUM BACA ATAU TULIS APA PUN LAIN:
1. Buka docs/ec-v2/STATUS.md. Ini SATU-SATUNYA sumber kebenaran status task.
   Kalau taskmu sudah 🟦 (diklaim agent lain) atau ✅ (selesai), BERHENTI dan
   laporkan konflik — jangan mulai kerja.
2. Kalau taskmu ⬜ (belum diklaim): ubah barisnya jadi 🟦, isi kolom Agent +
   Tanggal klaim, commit HANYA file itu dengan pesan "[ec-status] klaim <ID>",
   push, baru lanjut ke langkah berikutnya.

SETELAH klaim, baca berurutan:
1. docs/agents/KRIYA-MASTER.md Bagian 5 (larangan `any`/`interface{}`/`typing.Any`)
   dan Bagian 10 (larangan global).
2. docs/rencana/EKSEKUSI-PARALEL-V2.md §0–§5 (aturan main R1–R20, kepemilikan
   file per agent, kontrak antarmuka Go & FE), lalu HANYA bagian task-mu (§6/§7/§8/§9).
3. Bagian docs/rencana/RENCANA-ECOMMERCE-V2.md yang dirujuk task-mu.
4. docs/ec-v2/LOG-<agent-mu>.md untuk posisi terakhir.

ATURAN KERAS (lihat EKSEKUSI-PARALEL-V2.md untuk detail lengkap):
- Kerjakan HANYA SATU task per sesi, di worktree yang ditentukan
  (C:\Porto\kriya-wt\agent-<x>). Jangan buat worktree lain, jangan hapus worktree ini.
- Branch: ec/<ID>-<slug> dari origin/main terbaru. Push branch di akhir SETIAP
  sesi kerja (bukan hanya saat task selesai) — kerja yang tidak di-push dianggap
  tidak ada.
- Hanya ubah file yang cocok pola kepemilikanmu (EKSEKUSI-PARALEL-V2.md §3).
  File tanpa pemilik = core = dilarang disentuh. Tidak ada DDL di F1/F2.
- TIPE DATA WAJIB EKSPLISIT: `any` (TS), `interface{}` (Go), `typing.Any` (Python)
  DILARANG. Dilarang membungkam lint/type checker (`as any`, `@ts-ignore`,
  `eslint-disable`, `# type: ignore`). Tipe terasa mustahil? Itu masalah kontrak:
  berhenti, tulis di "Permintaan lintas-domain" LOG-mu, jangan ditambal.
- Butuh sesuatu di luar kepemilikanmu (endpoint, kolom, kontrak baru)? BERHENTI,
  tulis permintaan, kerjakan bagian yang tidak terblokir, jangan menambal sendiri.

TUTUP SESI (WAJIB, semua langkah, bukan sebagian):
1. DoD EKSEKUSI-PARALEL-V2.md §2.2 (10 poin) hijau — tempel output ASLI, bukan ringkasan.
2. Commit "[ec-<x>] <ringkas>" dengan contoh curl endpoint yang disentuh di body.
3. Push branch, LALU VERIFIKASI dengan `git fetch origin` diikuti
   `git rev-parse ec/<ID>-*` vs `git rev-parse origin/ec/<ID>-*` — dua hash itu
   HARUS SAMA. Jangan berhenti setelah `git push` sukses tanpa reverifikasi —
   commit yang dibuat lalu "terasa sudah di-push" tapi ternyata cuma di local
   branch adalah PERSIS kegagalan yang terjadi pada task 0A dan 0B (lihat
   docs/ec-v2/STATUS.md riwayat audit). Ini berlaku juga kalau kamu manusia
   (Satria) yang commit manual, bukan cuma agent.
4. Satu baris di docs/ec-v2/LOG-<agent-mu>.md.
5. Tulis docs/report/<ID>.md memakai template di EKSEKUSI-PARALEL-V2.md §14.
   Nama file HARUS PERSIS "0A.md"/"0B.md"/"A1.md" dst — TIDAK boleh "REPORT-0A.md"
   atau variasi lain. Cek dengan `test -f docs/report/<ID>.md`, bukan `ls | grep`.
6. Ubah baris <ID> di docs/ec-v2/STATUS.md jadi ✅ — kolom Commit HARUS hasil
   `git log origin/ec/<ID>-* -1` (bukan `git log` lokal atau `git branch -v`),
   commit "[ec-status] tutup <ID>", push.

Jangan pernah merge ke main — itu tugas Claude (reviewer/integrator).
Task tanpa baris ✅ di docs/ec-v2/STATUS.md dianggap belum dikerjakan, apa pun
klaim di ringkasan sesi atau percakapan manapun. Baris ✅ pun tidak otomatis
dipercaya oleh reviewer — reviewer akan reverifikasi origin dari nol (§11 EKSEKUSI-
PARALEL-V2.md langkah 0).
