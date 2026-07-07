// Hook TanStack Query terpusat untuk semua server state di client components
// (AGENT-FE). Semua query lewat fetcher lib/api.ts — tidak ada fetch liar.

import { useQuery } from "@tanstack/react-query";
import { getCategories, getProduct, getProducts, getOrders, getOrder, type ProductsQuery } from "./api";

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
