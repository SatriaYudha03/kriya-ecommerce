import { cache } from "react";
import { cookies } from "next/headers";
import type { Locale } from "../i18n";
import type { ListEnvelope } from "../http";
import type { Category, ProductDetail, ProductListItem } from "./types";
import { getCategories, getProduct, getProducts, type ProductsQuery } from "./api";

// Loader katalog untuk Server Component (modul ini memakai next/headers, jadi
// tidak bisa ter-import ke client). Tiga hal yang tidak dilakukan fetch biasa:
//  1. locale dibaca dari cookie `kriya-locale` — getLocaleCookie() di lib/http.ts
//     hanya jalan di browser, sehingga fetch server dulu selalu "id";
//  2. React cache() = satu fetch per render walau dipanggil dari
//     generateMetadata, layout, dan page sekaligus;
//  3. `revalidate` = cache data Next.js, jadi request berikutnya tidak menunggu
//     round-trip API → Supabase sama sekali.
// Lihat docs/rencana/RENCANA-PERFORMA-LATENSI.md Fase 3.

// Detik. Kategori jarang berubah; produk memuat harga & stok, jadi lebih pendek.
const CATEGORIES_REVALIDATE = 300;
const PRODUCTS_REVALIDATE = 60;

export const getServerLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get("kriya-locale")?.value;
  return value === "en" ? "en" : "id";
});

export const getCategoriesServer = cache(
  (locale: Locale): Promise<Category[]> =>
    getCategories({ lang: locale, revalidate: CATEGORIES_REVALIDATE }),
);

export const getProductServer = cache(
  (slug: string, locale: Locale): Promise<ProductDetail> =>
    getProduct(slug, { lang: locale, revalidate: PRODUCTS_REVALIDATE }),
);

export function getProductsServer(
  query: ProductsQuery,
  locale: Locale,
): Promise<ListEnvelope<ProductListItem>> {
  return getProducts(query, { lang: locale, revalidate: PRODUCTS_REVALIDATE });
}
