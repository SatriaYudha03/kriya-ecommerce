# 2026-10-03 — Claude — Revamp hero + navbar (gaya referensi "Livora")

**Task:** [fe] rombak top bar, header, dan hero home agar mirip referensi (foto full-bleed,
navbar transparan di atas hero), memakai fitur yang sudah ada. Carousel tetap berjalan.

**Status:** selesai, belum di-commit (menunggu Satria).

**Keputusan Satria (ditanya sebelum kerja):**
- Navbar transparan (teks putih) **hanya di home**; saat digulir / menu mobile dibuka / di halaman lain jadi **putih dengan teks gelap** (revisi Satria — awalnya solid espresso).
- Menu: dropdown **Katalog** (mega-menu 6 kategori bergambar) + 3 ruangan dipin (ruang keluarga, ruang kerja, kamar tidur). Tidak ada halaman palsu (Our story/Blogs).
- Share bar sosial: **dilewati**.
- Top bar: promo (tengah) + dropdown bahasa (kanan). Tanpa mata uang.

**Perubahan (semua di `apps/web/`):**
- `app/globals.css` — token `--color-espresso: #2b1d17`.
- `components/kriya/top-bar.tsx` — promo + dropdown bahasa (CSS hover/focus-within, tanpa state).
- `components/kriya/site-header.tsx` — ditulis ulang: h-20, putih di atas gelap; scroll dideteksi via `useSyncExternalStore` (tanpa setState di effect); mega-menu Katalog; search (semua layar; di mobile logo disembunyikan saat terbuka) = ikon di sebelah profil, diklik → kolom melebar kanan→kiri mengisi ruang sampai menu terakhir (outline sewarna ikon, rounded-sm; tutup saat Esc/blur), tombol search & × netral (× bawaan browser disembunyikan); ikon akun = dropdown (profil/pesanan/keluar) bila login, `/login` bila belum; toggle bahasa dipindah ke top bar. Notifikasi dipindah ke dropdown akun (item + badge jumlah belum dibaca, titik terracotta di ikon akun; juga di menu mobile) — `NotificationBell` tidak lagi dipakai header.
- `components/kriya/hero.tsx` — full-bleed `-mt-20` (menyelip di bawah header sticky), tinggi `100svh - top bar` (min 560, maks 860 di ≥sm), semua slide bertumpuk → crossfade + zoom pelan (motion-reduce aman), CTA "Belanja sekarang" (ke kategori slide) + "Jelajahi koleksi kami" (`#collections`), indikator + prev/next. Autoplay 6 s, pause saat hover, timer reset saat navigasi manual.
- `components/kriya/category-showcase.tsx` — `id="collections"` + `scroll-mt-24` (target "Lihat semua ruangan" & CTA kedua).
- `customer/wishlist-nav-button.tsx`, `aftersales/notification-bell.tsx` — prop opsional `className` (agar ikon putih di header gelap); badge wishlist pakai `bg-brand`.
- i18n `messages/{id,en}/core.ts` — key baru: `nav.catalog`, `nav.catalogAll`, `nav.account`, `nav.openMenu`, `nav.language`, `home.hero.shopNow`, `home.hero.explore`, `home.hero.goTo`.

**Verifikasi:** `tsc --noEmit` 0 error; `eslint` pada semua file yang disentuh 0 problem. Playwright (dev server :3000):
home 1366px (header transparan, mega-menu, header solid setelah scroll), `/categories/workspace` (header solid + garis aktif),
mobile 390px (tanpa scroll horizontal, menu mobile solid, dots tidak menabrak bubble chat), autoplay slide 1→2 terbukti.
`next build` **tidak** dijalankan (dev server sedang memakai `.next`) — jalankan sebelum commit.

**Catatan lanjutan:** `nav.searchPlaceholder` cukup panjang untuk kolom search; bila nanti ingin persis referensi cukup ganti ke "Cari".
