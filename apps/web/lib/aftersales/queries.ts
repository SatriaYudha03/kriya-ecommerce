import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrders, getOrder, getAdminOrders, updateAdminOrderStatus, cancelOrder, getProductReviews, getProductReviewSummary, getMyReviewables, getMyReviews, createReview, updateReview, getAdminReviews, updateAdminReview } from "./api";
import { useLanguage } from "@/components/kriya/language-provider";
import type { AdminOrdersQuery, OrderStatus, CreateReviewRequest, UpdateReviewRequest, AdminUpdateReviewRequest, ReviewStatus } from "./types";
import { toast } from "sonner";
import { ApiError } from "../http";
import { promoKeys } from "../promo/queries";

export const afterKeys = {
  all: ["after"] as const,
  orders: (locale: string) => [...afterKeys.all, "orders", locale] as const,
  order: (id: string, locale: string) => [...afterKeys.all, "order", id, locale] as const,
  adminOrders: (query: AdminOrdersQuery) => [...afterKeys.all, "admin-orders", query] as const,
  
  reviews: (slug: string, status: string, page: number) => [...afterKeys.all, "reviews", slug, status, page] as const,
  reviewSummary: (slug: string) => [...afterKeys.all, "review-summary", slug] as const,
  myReviewables: (page: number) => [...afterKeys.all, "my-reviewables", page] as const,
  myReviews: (page: number) => [...afterKeys.all, "my-reviews", page] as const,
  adminReviews: (status?: string, page?: number) => [...afterKeys.all, "admin-reviews", status, page] as const,
};

export function useOrders(page: number = 1, limit: number = 10, status?: string) {
  const { locale } = useLanguage();
  return useQuery({
    queryKey: [...afterKeys.orders(locale), page, limit, status],
    queryFn: () => getOrders(page, limit, status),
  });
}

export function useOrder(id: string) {
  const { locale } = useLanguage();
  return useQuery({
    queryKey: afterKeys.order(id, locale),
    queryFn: () => getOrder(id),
    enabled: Boolean(id),
  });
}

export function useAdminOrders(query: AdminOrdersQuery = {}) {
  return useQuery({
    queryKey: afterKeys.adminOrders(query),
    queryFn: () => getAdminOrders(query),
    retry: false,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateAdminOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: afterKeys.all });
      qc.invalidateQueries({ queryKey: promoKeys.stats() });
      toast.success("Status pesanan diperbarui");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Gagal memperbarui status");
    },
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => cancelOrder(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: afterKeys.all });
      toast.success("Pesanan berhasil dibatalkan");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Gagal membatalkan pesanan");
    },
  });
}

// Reviews

export function useProductReviews(slug: string, status: string = "approved", page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: afterKeys.reviews(slug, status, page),
    queryFn: () => getProductReviews(slug, status, page, limit),
    enabled: Boolean(slug),
  });
}

export function useProductReviewSummary(slug: string) {
  return useQuery({
    queryKey: afterKeys.reviewSummary(slug),
    queryFn: () => getProductReviewSummary(slug),
    enabled: Boolean(slug),
  });
}

export function useMyReviewables(page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: afterKeys.myReviewables(page),
    queryFn: () => getMyReviewables(page, limit),
  });
}

export function useMyReviews(page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: afterKeys.myReviews(page),
    queryFn: () => getMyReviews(page, limit),
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateReviewRequest) => createReview(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: afterKeys.all });
      toast.success("Ulasan berhasil dikirim (menunggu moderasi)");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Gagal mengirim ulasan");
    },
  });
}

export function useUpdateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: UpdateReviewRequest }) => updateReview(id, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: afterKeys.all });
      toast.success("Ulasan berhasil diperbarui (menunggu moderasi ulang)");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Gagal memperbarui ulasan");
    },
  });
}

export function useAdminReviews(status?: ReviewStatus, page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: afterKeys.adminReviews(status, page),
    queryFn: () => getAdminReviews(status, page, limit),
  });
}

export function useAdminUpdateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: AdminUpdateReviewRequest }) => updateAdminReview(id, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: afterKeys.all });
      toast.success("Ulasan diperbarui");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Gagal memperbarui ulasan");
    },
  });
}
