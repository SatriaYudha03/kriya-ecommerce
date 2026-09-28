**Task**: Fase 3 `docs/rencana/RENCANA-PERFORMA-LATENSI.md` — hapus fetch ganda & cache data katalog publik di FE.

**Status**: selesai. `next build` + `tsc --noEmit` hijau; `eslint .` 0 error, 4 warning `@next/next/no-img-element` yang sudah ada sebelumnya di file yang tidak disentuh (`app/(admin)/admin/orders/[id]/page.tsx`, `app/(store)/orders/[id]/page.tsx`, `components/kriya/admin/product-form.tsx`, `components/kriya/category-view.tsx`).

**Fitur/bug dicatat**:
- `apps/web/lib/catalog/server.ts` (baru): loader Server Component — `getServerLocale()`, `getCategoriesServer` (revalidate 300 s), `getProductServer` (60 s, React `cache()`), `getProductsServer` (60 s). Mode caching lama Next 16 (tanpa `cacheComponents`).
- `app/(store)/products/[slug]/page.tsx`: produk diambil sekali di server untuk metadata + page → `ProductDetailView initialProduct` → `useProduct(slug, initial)` (`initialData` hanya bila locale sama). Client tidak lagi fetch ulang saat mount.
- `useProduct` tidak me-retry 404: "produk tidak ditemukan" tampil ±1,3 s (dulu ±10 s karena retry 3× backoff).
- Home (`app/(store)/page.tsx` + `home-rails.ts` + `client-product-rails.tsx` + `product-rail.tsx`): kategori + 3 rail di-fetch paralel di server; HTML pertama sudah berisi 16 kartu produk.
- Bug diperbaiki: kategori di layout toko dulu selalu bahasa `id` di render server (`getLocaleCookie()` hanya jalan di browser). Kini ikut cookie & cache terpisah per bahasa (terverifikasi).
- `lib/http.ts`: `Content-Type: application/json` hanya bila ada body — GET browser tidak lagi memicu preflight CORS `OPTIONS`. Opsi `revalidate` → `next: { revalidate }`.
- `NotificationBell` + `useUnreadNotificationCount(enabled)`: tamu tidak lagi memanggil `unread-count` (dulu 401 + retry di tiap halaman).
- Ukuran Playwright (build produksi): home 2,0–2,8 → 1,5 s (cache kosong) / 0,07–0,24 s (terisi); detail 1,3–2,0 → 0,8–1,2 / ~0,1 s; request API 82 → 20 per 6 page load. Tabel lengkap di dokumen rencana.
- Konsekuensi: harga/stok di halaman publik bisa telat ≤ 60 s setelah admin mengubah (kategori ≤ 5 menit); checkout tetap divalidasi backend.

**Permintaan lintas-teritori**: BE — tambah `Access-Control-Max-Age` di `services/api/internal/middleware` CORS agar preflight request ber-`Authorization` di-cache browser (opsional, bukan blocker).

**Next**: opsional — halaman kategori (`CategoryView` client) & blok related/review PDP masih fetch di client; Fase 4 (pindah Supabase ke Singapura) keputusan Satria.
