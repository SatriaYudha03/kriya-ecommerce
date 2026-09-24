# docs/state/ — Ringkasan sesi

Setiap agent menutup sesinya dengan menambah **satu file baru** di sini (lihat
`docs/agents/KRIYA-MASTER.md` Bagian 8.1 untuk aturan lengkap). Ini bukan
pengganti Log di `docs/agents/AGENT-*.md`, melainkan pelengkap yang lebih
naratif — supaya sesi berikutnya cepat mengenali konteks fitur/bug yang sudah
dicatat tanpa membaca ulang seluruh riwayat.

**Nama file:** `YYYY-MM-DD-<agent>-<slug-singkat>.md`
contoh: `2026-07-14-fe-i18n-kategori.md`

**Isi minimal:**
- **Task** — apa yang dikerjakan sesi ini.
- **Status** — selesai / sebagian / diblokir, dan kenapa.
- **Fitur/bug dicatat** — fitur baru, bug ditemukan/diperbaiki, file:baris bila relevan.
- **Permintaan lintas-teritori** (bila ada).
- **Next** — task berikutnya yang disarankan untuk teritori ini.

Menulis di folder ini tidak butuh sesi yang diawasi Satria (sama seperti
pengecualian `docs/devops/*.md`), karena ini bagian dari ritual sesi wajib.
