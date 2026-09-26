// Hook TanStack Query terpusat untuk semua server state di client components
// (AGENT-FE). Semua query lewat fetcher lib/api.ts — tidak ada fetch liar.

import { useQuery } from "@tanstack/react-query";
import { getCategories, getProduct, getProducts, getOrders, getOrder, getProfile, searchProducts, getSimilarProducts, type ProductsQuery } from "./api";
import { useLanguage } from "@/components/kriya/language-provider";

// Konten (nama, deskripsi, material, warna/ukuran) dilokalkan server via
// Accept-Language. Sertakan `locale` di queryKey agar ganti bahasa memicu
// refetch — tanpa ini React Query menyajikan cache bahasa lama.

export function useCategories() {
  const { locale } = useLanguage();
  return useQuery({
    queryKey: ["categories", locale],
    queryFn: getCategories,
    staleTime: 5 * 60_000,
  });
}

export function useProducts(query: ProductsQuery = {}) {
  const { locale } = useLanguage();
  return useQuery({
    queryKey: ["products", query, locale],
    queryFn: () => getProducts(query),
  });
}

export function useProduct(slug: string) {
  const { locale } = useLanguage();
  return useQuery({
    queryKey: ["product", slug, locale],
    queryFn: () => getProduct(slug),
    enabled: Boolean(slug),
  });
}

export function useOrders(page = 1, limit = 10, status?: string) {
  const { locale } = useLanguage();
  return useQuery({
    queryKey: ["orders", locale, page, limit, status],
    queryFn: () => getOrders(page, limit, status),
  });
}

export function useOrder(id: string) {
  const { locale } = useLanguage();
  return useQuery({
    queryKey: ["order", id, locale],
    queryFn: () => getOrder(id),
    enabled: Boolean(id),
  });
}

export function useProfile(enabled = true) {
  return useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    enabled,
    staleTime: 60_000,
  });
}

export function useSearch(q: string) {
  const { locale } = useLanguage();
  return useQuery({
    queryKey: ["search", q, locale],
    queryFn: () => searchProducts(q),
    enabled: Boolean(q.trim()),
  });
}

export function useSimilarProducts(id: string) {
  const { locale } = useLanguage();
  return useQuery({
    queryKey: ["similar", id, locale],
    queryFn: () => getSimilarProducts(id),
    enabled: Boolean(id),
  });
}
