// Hook TanStack Query terpusat untuk semua server state di client components
// (AGENT-FE). Semua query lewat fetcher lib/api.ts — tidak ada fetch liar.

import { useQuery } from "@tanstack/react-query";
import { getCategories, getProduct, getProducts, getOrders, getOrder, searchProducts, getSimilarProducts, type ProductsQuery } from "./api";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 5 * 60_000,
  });
}

export function useProducts(query: ProductsQuery = {}) {
  return useQuery({
    queryKey: ["products", query],
    queryFn: () => getProducts(query),
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: () => getProduct(slug),
    enabled: Boolean(slug),
  });
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: getOrders,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrder(id),
    enabled: Boolean(id),
  });
}

export function useSearch(q: string) {
  return useQuery({
    queryKey: ["search", q],
    queryFn: () => searchProducts(q),
    enabled: Boolean(q.trim()),
  });
}

export function useSimilarProducts(id: string) {
  return useQuery({
    queryKey: ["similar", id],
    queryFn: () => getSimilarProducts(id),
    enabled: Boolean(id),
  });
}
