import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCategories, getProduct, getProducts, searchProducts, getSimilarProducts, getAdminProduct, deleteProduct, type ProductsQuery } from "./api";
import { ApiError } from "../http";
import { useLanguage } from "@/components/kriya/language-provider";
import { promoKeys } from "../promo/queries";

export const catalogKeys = {
  all: ["catalog"] as const,
  categories: (locale: string) => [...catalogKeys.all, "categories", locale] as const,
  products: (query: ProductsQuery, locale: string) => [...catalogKeys.all, "products", query, locale] as const,
  product: (slug: string, locale: string) => [...catalogKeys.all, "product", slug, locale] as const,
  search: (q: string, locale: string) => [...catalogKeys.all, "search", q, locale] as const,
  similar: (id: string, locale: string) => [...catalogKeys.all, "similar", id, locale] as const,
  adminProduct: (id: string) => [...catalogKeys.all, "admin-product", id] as const,
};

export function useCategories() {
  const { locale } = useLanguage();
  return useQuery({
    queryKey: catalogKeys.categories(locale),
    queryFn: getCategories,
    staleTime: 5 * 60_000,
  });
}

export function useProducts(query: ProductsQuery = {}) {
  const { locale } = useLanguage();
  return useQuery({
    queryKey: catalogKeys.products(query, locale),
    queryFn: () => getProducts(query),
  });
}

export function useProduct(slug: string) {
  const { locale } = useLanguage();
  return useQuery({
    queryKey: catalogKeys.product(slug, locale),
    queryFn: () => getProduct(slug),
    enabled: Boolean(slug),
  });
}

export function useSearch(q: string) {
  const { locale } = useLanguage();
  return useQuery({
    queryKey: catalogKeys.search(q, locale),
    queryFn: () => searchProducts(q),
    enabled: Boolean(q.trim()),
  });
}

export function useSimilarProducts(id: string) {
  const { locale } = useLanguage();
  return useQuery({
    queryKey: catalogKeys.similar(id, locale),
    queryFn: () => getSimilarProducts(id),
    enabled: Boolean(id),
  });
}

export function useAdminProduct(id: string, enabled = true) {
  return useQuery({
    queryKey: catalogKeys.adminProduct(id),
    queryFn: () => getAdminProduct(id),
    enabled: enabled && Boolean(id),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: catalogKeys.all });
      qc.invalidateQueries({ queryKey: promoKeys.stats() });
      toast.success("Produk dihapus");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Gagal menghapus produk");
    },
  });
}
