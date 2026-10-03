# Audit kesiapan produksi — KRIYA sebagai e-commerce sungguhan

- **Task**: audit read-only kelemahan KRIYA bila dirilis ke produksi sebagai toko sungguhan (security, logika bisnis, arsitektur, operasional). Tidak ada kode yang diubah.
- **Status**: selesai (audit). Belum ada perbaikan yang dikerjakan.
- **Cakupan yang dibaca**: `services/api` (main, middleware, checkout, promo, aftersales returns/refund, customer payment/profile, catalog ledger/admin), `supabase/migrations` (RLS, constraint), `automation/n8n/chatbot.json`, `apps/web` (next.config, proxy, Dockerfile), `helm/`, `.github/workflows`, `docker-compose.yml`, `supabase/config.toml`.
- **Belum dicek mendalam**: seluruh komponen FE satu per satu, `cmd/seed`, isi `stats_repo` per laporan, konfigurasi Supabase di dashboard produksi (yang dicek hanya `config.toml` lokal).

## Ringkasan

Fondasinya sudah bagus: harga dihitung di server, stok dikunci per baris (`FOR UPDATE`) + ledger, ada state machine order, signature webhook Midtrans diverifikasi, webhook idempoten, RLS aktif (default deny) di semua tabel, ada constraint DB `refunded_qty <= qty`. Tapi ada **blocker** yang membuat aplikasi ini belum bisa menerima uang sungguhan dengan aman, terutama di siklus hidup pembayaran (order menggantung, pembayaran setelah batal) dan konfigurasi deploy.

## KRITIS — wajib beres sebelum rilis

| # | Temuan | Lokasi | Dampak |
|---|---|---|---|
| K1 | **Password admin ter-commit di repo**: `admin@kriya.com` / `kriya12345` (plus `test_db.go` yang membaca `auth.users`). | `update_admin_pw.go:10`, `test_db.go` (tracked) | Siapa pun yang punya akses repo (atau kalau repo publik) bisa login sebagai admin. Rotasi password, hapus file, bersihkan riwayat git, buat ulang akun admin dengan email yang tidak bisa ditebak. |
| K2 | **Midtrans di-hardcode ke Sandbox** (Snap, cancel, status). | `service/midtrans.go:17-19` | Tidak bisa terima uang sungguhan tanpa ubah kode. Jadikan env (`MIDTRANS_IS_PRODUCTION`) dan pastikan server key produksi tidak pernah bocor ke sandbox atau sebaliknya. |
| K3 | **Order `pending_payment` tidak pernah kedaluwarsa sendiri.** Tidak ada job/sweeper; status `expired` cuma bisa datang dari webhook Midtrans (`CanTransition` pending→expired hanya untuk `payment_gateway`). Kalau pembeli menutup popup Snap tanpa memilih metode bayar, Midtrans tidak pernah tahu transaksinya, jadi webhook `expire` tidak pernah datang. | `checkout/status.go` (`CanTransition`), tidak ada ticker/cron di `services/api` | **Stok dan kupon tertahan selamanya.** Ini juga celah serangan: satu akun bisa bikin banyak order sampai semua stok "habis", atau menghabiskan kuota kupon terbatas (`usage_limit` menghitung redemption `reserved`). `POST /orders/:id/pay` juga terus memperpanjang reservasi tanpa batas. |
| K4 | **Pembayaran yang masuk setelah order batal/expired diabaikan diam-diam.** Webhook menelan `InvalidTransitionError` (`return nil`). Pembatalan oleh pembeli memanggil `CancelTransaction` hanya untuk attempt `active`, sifatnya best-effort, dan error-nya dibuang. | `checkout/payment_handler.go:171`, `aftersales/order_handler.go:315-320` | Uang pembeli terpotong (mis. VA dibayar setelah batal), order tetap `cancelled`, stok sudah dilepas, dan **tidak ada alert/refund**. Dari sisi pembeli ini sudah dianggap penipuan. Wajib: status khusus atau antrean "paid_after_cancel", notifikasi admin, dan refund otomatis/manual. |
| K5 | **Kalau secret Helm kosong, nilainya jadi `"dummy"`.** Itu berlaku juga untuk `SUPABASE_JWT_SECRET` dan `INTERNAL_API_KEY`. `SUPABASE_URL` (untuk JWKS) bahkan tidak ada di values Helm. | `helm/kriya/templates/secrets.yaml:12`, `helm/kriya/values.yaml` | Kalau operator membiarkan JWT secret kosong (wajar, karena project sudah pakai kunci asimetrik), middleware menerima **token HS256 yang ditandatangani dengan "dummy"**. Penyerang bisa memalsukan `sub` user mana pun, termasuk admin, dan akhirnya mengambil alih seluruh toko. Seharusnya gagal saat start (fail-fast) kalau secret kosong, jangan pakai default. |
| K6 | **Webhook memperlakukan `capture` sebagai lunas tanpa cek `fraud_status`.** | `service/midtrans.go:223`, struct `midtransNotification` | Transaksi kartu kredit dengan `fraud_status=challenge` langsung dianggap `paid` lalu diproses/dikirim. Tambahkan `fraud_status` dan anggap lunas hanya kalau `accept`. Sekalian cocokkan `gross_amount` dengan `orders.total` sebagai lapisan pertahanan tambahan. |

## TINGGI

| # | Temuan | Lokasi | Dampak |
|---|---|---|---|
| T1 | **Tidak ada rate limiting** di API Gin. | `cmd/api/main.go` | Kode kupon privat bisa di-brute-force lewat `POST /coupons/validate` (publik, `promo/routes.go:24`). Spam `POST /orders` memperparah K3. `POST /orders/:id/payment/sync` memicu N request ke Midtrans per panggilan, jadi bisa jadi amplifikasi dan kena kuota API. |
| T2 | **Refund admin tanpa cek status order.** Order `pending_payment`/`cancelled`/`expired` bisa di-refund (`refundable_amount = total`). Kalau transisi ditolak state machine, ada "Fallback F1" yang **memaksa `status='refunded'` langsung ke tabel**, melewati `orderflow`. | `aftersales/returns_handler.go:226-321`, `aftersales/returns_repo.go:334-355` | Catatan keuangan bisa salah (refund atas uang yang tidak pernah diterima) dan state machine bisa dilompati. Batasi refund hanya untuk status paid/processing/shipped/completed, lalu hapus fallback-nya. |
| T3 | **Snap token kosong menyandera order.** Kalau `UpdateAttemptSnapToken` gagal, atau proses mati di antara commit dan panggilan Snap (deploy tanpa graceful shutdown), attempt `active` tersimpan dengan `snap_token` NULL. `PayOrder` lalu mengembalikan token kosong itu sampai `expires_at` lewat (default 24 jam). | `checkout/order_handler.go:58`, `customer/payment_handler.go:70` | Pembeli tidak bisa bayar, stok tertahan. |
| T4 | **Dua jalur pembayaran yang tidak konsisten.** `customer.PayOrder` membuat Snap **tanpa expiry** (`CreateSnapTransaction`), men-supersede attempt lama **tanpa membatalkannya di Midtrans**, dan tidak memakai lock (klik ganda menghasilkan 2 attempt aktif). Kode error-nya juga UPPERCASE, melanggar kontrak. | `customer/payment_handler.go:76-118` | Risiko satu order dibayar dua kali (attempt lama + baru sama-sama bisa dibayar; webhook kedua di-no-op karena order sudah `paid`, jadi pembeli tertagih dua kali tanpa refund). |
| T5 | **Pool koneksi DB melebihi batas Supabase.** `maxOpenConns=10` per pod × `replicaCount: 2` (`helm/values-api.yaml`) = 20, padahal pool_size Supabase 15, ditambah n8n. | `db/db.go:19` | Muncul "max clients reached" saat ramai, dan checkout gagal di momen paling penting (promo/flash sale). Pakai transaction pooler (6543) atau hitung batas per replika. |
| T6 | **Edit varian/penyesuaian stok menulis nilai absolut.** | `catalog/admin_repo.go:53`, `:377` | Admin membuka form (stok 10), lalu 2 order masuk (stok jadi 8), lalu admin menyimpan form untuk ubah harga dan stok kembali ke 10. Terjadi **oversell**. Kirim delta, atau cek versi (optimistic lock). |
| T7 | **Server HTTP tanpa hardening**: `gin.Default()` di mode debug (tidak ada `GIN_MODE=release`), tidak ada `ReadTimeout`/`WriteTimeout` (rentan slowloris), tidak ada batas ukuran body, tidak ada graceful shutdown. | `cmd/api/main.go:32`, `r.Run` | Rentan DoS ringan. Deploy memutus request yang sedang jalan (memicu T3). |
| T8 | **Tidak ada email transaksional** (konfirmasi order, instruksi bayar, resi). M5 belum dimulai; notifikasi hanya in-app. | `docs/agents/KRIYA-MASTER.md` §0 | Untuk toko sungguhan, pembeli tidak menerima bukti order. Ini memicu banyak tiket CS dan chargeback. |

## SEDANG

- **Keamanan auth**
  - Middleware tidak memvalidasi `aud`/`role`/`iss`. Anon key Supabase (JWT publik, tanpa `sub`) lolos `Auth`; handler yang memakai `c.GetString("user_id")` jadi query dengan `""` dan berakhir 500, bukan 401 (`middleware/auth.go`).
  - Perbandingan `X-Internal-Key` dan signature Midtrans tidak constant-time (`middleware/internal_key.go`, `service/midtrans.go:218`).
  - Cache role admin 5 menit di memori per pod, jadi pencabutan admin tidak langsung berlaku (`middleware/admin.go`).
  - Admin tanpa MFA. Supabase lokal: `minimum_password_length = 6`, tanpa `password_requirements`, `enable_confirmations = false` (email tidak diverifikasi, jadi batas kupon per-user mudah diakali dengan banyak akun). Pastikan pengaturan ini di dashboard produksi.
- **Header keamanan FE tidak ada**: tanpa CSP, HSTS, `X-Frame-Options`/`frame-ancestors`, Referrer-Policy (`apps/web/next.config.ts`). Halaman checkout bisa di-clickjack.
- **Siklus order belum lengkap**: tidak ada auto-complete `shipped → completed` (actor `system` ada, job-nya tidak ada), padahal retur dan ulasan **hanya** bisa untuk order `completed`. Kalau admin lupa, pembeli tidak pernah bisa retur/ulas. Window retur 7 hari di-hardcode (`returns_handler.go:54`).
- **Refund manual saja**: `Method: "manual"`, tidak ada integrasi refund Midtrans. Rumus diskon per unit memakai pembagian integer (`returns_handler.go:270`), jadi sisa rupiah hilang.
- **Laporan omzet** menjumlahkan `orders.total` tanpa mengurangi refund parsial (`promo/stats_repo.go:25`), sehingga omzet terlihat lebih besar dari kenyataan.
- **Pengiriman**: ongkir dari tabel zona flat, tanpa integrasi kurir (RajaOngkir/Biteship), tanpa validasi resi/tracking. Untuk furniture (berat/volumetrik besar), ini rawan rugi ongkir.
- **Guest checkout tidak ada** (semua endpoint checkout `authed`), padahal persona PRD mencakup "pembeli guest". Ini menurunkan konversi.
- **Deploy/infra**
  - Image `tag: latest` + `pullPolicy: Always`, sehingga rollback tidak reproducible.
  - `aquasecurity/trivy-action@master` tidak di-pin, jadi ada risiko supply-chain.
  - Container API berjalan sebagai root (`services/api/Dockerfile`, tanpa `USER`).
  - `apps/web` tidak punya `.dockerignore`, padahal `apps/web/.env` berisi secret server (service role key, DB URL, Midtrans server key). `COPY . .` membawanya ke layer builder. **Perlu dicek** apakah ikut ke output standalone/cache. Pindahkan secret server keluar dari folder web.
  - Tidak ada langkah migrasi DB di CD. Migrasi diterapkan manual/MCP, dan ada file liar (`fix_products*.sql` di root, `services/api/db/seed.sql`, untracked).
  - CORS n8n dan URL tool chatbot di-hardcode `localhost:3000` / `host.docker.internal` (`automation/n8n/chatbot.json`).
- **Observability**: hanya logger default gin. Tidak ada request-id, structured log, error tracking (Sentry), atau alert untuk webhook gagal/K4. `/healthz` tidak mengecek DB.
- **Arsitektur data**: DB di region Sydney (latensi tinggi dari Indonesia, keputusan Fase 4 masih terbuka). Perlu dicek juga apakah backup/PITR aktif di tier Supabase yang dipakai.

## RENDAH

- Nomor order berurutan `KRY-YYMMDD-000123` membocorkan volume penjualan harian ke kompetitor.
- `customer_note`, alasan batal, dan `reason_code` retur tanpa batas panjang (`binding` tanpa `max`).
- Filter `attrs` tanpa batas jumlah term (setiap atribut menambah satu subquery `EXISTS`).
- `SECURITY DEFINER handle_new_user()` tanpa `SET search_path` (`001_commerce_core.sql`).
- Working tree kotor dengan banyak perubahan belum di-commit (termasuk `data/kb/*.md` terhapus), jadi state rilis tidak jelas.
- **Kepatuhan**: UU PDP (kebijakan privasi, hapus/ekspor data akun, retensi PII alamat/telepon di snapshot order) belum ada endpoint/proses. Syarat & ketentuan, kebijakan retur/garansi resmi, dan identitas usaha (NIB) di footer perlu disiapkan.

## Urutan perbaikan yang disarankan

1. K1 (rotasi kredensial admin, purge file) dan K5 (fail-fast config). Murah dan dampaknya terbesar.
2. K3 + K4 + T3 + T4: satu paket "payment lifecycle". Isinya job sweeper expiry (actor `system` boleh pending→expired), satu jalur pembuatan attempt saja (cancel attempt lama di Midtrans), deteksi dan alert "paid after cancel", dan graceful shutdown.
3. K2 + K6: Midtrans production via env, `fraud_status`, cek `gross_amount`.
4. T1 + T7: rate limit (per IP + per user) dan hardening server.
5. T2, T5, T6, lalu T8 (email transaksional via n8n M5).
6. Sisanya bertahap: SEDANG, lalu RENDAH.

## Permintaan lintas-teritori

Belum ada yang diajukan. Perbaikan menyentuh BE (`services/api`), DevSecOps (`helm/`, CI), dan migrasi bersama (sweeper/`CanTransition` actor `system`). Satria yang memutuskan pembagiannya.

## Next

Pilih satu paket di atas sebagai task berikutnya. Saran: paket #2 "payment lifecycle" (BE), didahului #1 yang bisa dikerjakan Satria langsung.
