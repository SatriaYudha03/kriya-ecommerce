import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCategories, getProduct, getProducts, getRelatedProducts, getAdminProducts, searchProducts, getSimilarProducts, getAdminProduct, deleteProduct, getAdminCategories, getAdminCategory, createCategory, updateCategory, deleteCategory, getTags, getAttributes, getAdminTags, getAdminAttributes, getAdminInventory, getAdminMovements, adjustStock, type ProductsQuery, type AdminProductsQuery, type AdminInventoryQuery } from "./api";
import { ApiError } from "../http";
import { useLanguage } from "@/components/kriya/language-provider";
import { promoKeys } from "../promo/queries";

export const catalogKeys = {
  all: ["catalog"] as const,
  categories: (locale: string) => [...catalogKeys.all, "categories", locale] as const,
  adminCategories: () => [...catalogKeys.all, "adminCategories"] as const,
  adminCategory: (id: string) => [...catalogKeys.all, "adminCategory", id] as const,
  products: (query: ProductsQuery, locale: string) => [...catalogKeys.all, "products", query, locale] as const,
  product: (slug: string, locale: string) => [...catalogKeys.all, "product", slug, locale] as const,
  search: (q: string, locale: string) => [...catalogKeys.all, "search", q, locale] as const,
  similar: (id: string, locale: string) => [...catalogKeys.all, "similar", id, locale] as const,
  adminProducts: (query: AdminProductsQuery) => [...catalogKeys.all, "admin-products", query] as const,
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

export function useAdminProducts(query: AdminProductsQuery = {}) {
  return useQuery({
    queryKey: catalogKeys.adminProducts(query),
    queryFn: () => getAdminProducts(query),
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
  const { t } = useLanguage();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: catalogKeys.all });
      qc.invalidateQueries({ queryKey: promoKeys.stats() });
      toast.success(t("catalog.queries.deleted"));
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t("catalog.queries.deleteFailed"));
    },
  });
}

export function useAdminCategories() {
  return useQuery({
    queryKey: catalogKeys.adminCategories(),
    queryFn: getAdminCategories,
  });
}

export function useAdminCategory(id: string, enabled = true) {
  return useQuery({
    queryKey: catalogKeys.adminCategory(id),
    queryFn: () => getAdminCategory(id),
    enabled: enabled && Boolean(id),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: catalogKeys.all });
      toast.success(t("catalog.queries.catCreated"));
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t("catalog.queries.catCreateFailed"));
    },
  });
}

export function useUpdateCategory(id: string) {
  const qc = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: (payload: import('./types').AdminCategoryInput) => updateCategory(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: catalogKeys.all });
      toast.success(t("catalog.queries.catUpdated"));
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t("catalog.queries.catUpdateFailed"));
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: catalogKeys.all });
      toast.success(t("catalog.queries.catDeleted"));
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t("catalog.queries.catDeleteFailed"));
    },
  });
}
export function useTags() {
  return useQuery({
    queryKey: [...catalogKeys.all, "tags"],
    queryFn: () => getTags(),
  });
}

export function useAttributes(category?: string) {
  return useQuery({
    queryKey: [...catalogKeys.all, "attributes", category ?? "all"],
    queryFn: () => getAttributes(category),
  });
}

export function useAdminTags() {
  return useQuery({
    queryKey: [...catalogKeys.all, "admin-tags"],
    queryFn: () => getAdminTags(),
  });
}

export function useAdminAttributes() {
  return useQuery({
    queryKey: [...catalogKeys.all, "admin-attributes"],
    queryFn: () => getAdminAttributes(),
  });
}

export function useInventory(query: AdminInventoryQuery) {
  return useQuery({
    queryKey: [...catalogKeys.all, "inventory", query],
    queryFn: () => getAdminInventory(query),
  });
}

export function useMovements(variantId?: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: [...catalogKeys.all, "movements", variantId, page, limit],
    queryFn: () => getAdminMovements(variantId, page, limit),
  });
}

export function useAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adjustStock,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...catalogKeys.all, "inventory"] });
      qc.invalidateQueries({ queryKey: [...catalogKeys.all, "movements"] });
    },
  });
}

export function useRelatedProducts(slug: string, type: "upsell" | "cross_sell", limit = 8) {
  return useQuery({
    queryKey: [...catalogKeys.all, "related", slug, type, limit],
    queryFn: () => getRelatedProducts(slug, type, limit),
    enabled: !!slug,
  });
}
