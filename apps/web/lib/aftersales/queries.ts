import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrders, getOrder, getAdminOrders, updateAdminOrderStatus, cancelOrder, getProductReviews, getProductReviewSummary, getMyReviewables, getMyReviews, createReview, updateReview, getAdminReviews, updateAdminReview, getReturns, getReturn, getAdminReturns, createReturn, updateAdminReturnStatus, createAdminRefund, getNotifications, getUnreadNotificationCount, markNotificationsAsRead, getStoreInfo } from "./api";
import { useLanguage } from "@/components/kriya/language-provider";
import type { AdminOrdersQuery, OrderStatus, CreateReviewRequest, UpdateReviewRequest, AdminUpdateReviewRequest, ReviewStatus, CreateReturnRequest, AdminUpdateReturnStatusRequest, CreateRefundRequest } from "./types";
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

  returns: (page: number) => [...afterKeys.all, "returns", page] as const,
  return: (id: string) => [...afterKeys.all, "return", id] as const,
  adminReturns: (status?: string, page: number = 1) => [...afterKeys.all, "admin-returns", status, page] as const,

  notifications: (page: number, unreadOnly: boolean) => [...afterKeys.all, "notifications", page, unreadOnly] as const,
  unreadNotificationCount: () => [...afterKeys.all, "unread-notification-count"] as const,
  storeInfo: () => [...afterKeys.all, "store-info"] as const,
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
  const { t } = useLanguage();
  return useMutation({
    mutationFn: ({ id, status, courier, trackingNumber }: { id: string; status: OrderStatus; courier?: string; trackingNumber?: string }) =>
      updateAdminOrderStatus(id, status, undefined, courier, trackingNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: afterKeys.all });
      qc.invalidateQueries({ queryKey: promoKeys.stats() });
      toast.success(t("after.admin.orders.statusUpdated"));
    },
    onError: (err) => {
      // Pesan dari BE berbahasa Indonesia; terjemahkan berdasarkan kode error agar
      // mengikuti bahasa pilihan pengguna.
      const code = err instanceof ApiError ? err.code : "";
      if (code === "shipment_info_required") toast.error(t("after.admin.orders.err.shipment_info_required"));
      else if (code === "invalid_transition") toast.error(t("after.admin.orders.err.invalid_transition"));
      else toast.error(t("after.admin.orders.statusUpdateFailed"));
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
      // 409 = status order berubah (mis. ternyata sudah lunas saat BE mengecek Midtrans
      // sebelum membatalkan) — muat ulang supaya halaman menampilkan status terbaru.
      if (err instanceof ApiError && err.status === 409) {
        qc.invalidateQueries({ queryKey: afterKeys.all });
      }
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


export function useReturns(page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: afterKeys.returns(page),
    queryFn: () => getReturns(page, limit),
  });
}

export function useReturn(id: string) {
  return useQuery({
    queryKey: afterKeys.return(id),
    queryFn: () => getReturn(id),
    enabled: Boolean(id),
  });
}

export function useAdminReturns(status?: string, page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: afterKeys.adminReturns(status, page),
    queryFn: () => getAdminReturns(status, page, limit),
  });
}

export function useCreateReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, req }: { orderId: string; req: CreateReturnRequest }) => createReturn(orderId, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: afterKeys.all });
      toast.success("Pengajuan retur berhasil dibuat");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Gagal membuat retur");
    },
  });
}

export function useUpdateAdminReturnStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: AdminUpdateReturnStatusRequest }) => updateAdminReturnStatus(id, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: afterKeys.all });
      toast.success("Status retur diperbarui");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Gagal memperbarui status");
    },
  });
}

export function useCreateAdminRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, req }: { orderId: string; req: CreateRefundRequest }) => createAdminRefund(orderId, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: afterKeys.all });
      toast.success("Refund berhasil diproses");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Gagal memproses refund");
    },
  });
}

export function useNotifications(page: number = 1, unreadOnly: boolean = false) {
  return useQuery({
    queryKey: afterKeys.notifications(page, unreadOnly),
    queryFn: () => getNotifications(page, unreadOnly),
  });
}

// `enabled` = user sudah login. Tamu mendapat 401 dan TanStack Query mengulang
// (retry default 3×) di setiap halaman — request sia-sia ke API.
export function useUnreadNotificationCount(enabled: boolean = true) {
  return useQuery({
    queryKey: afterKeys.unreadNotificationCount(),
    queryFn: () => getUnreadNotificationCount(),
    refetchInterval: 60000,
    enabled,
  });
}

export function useMarkNotificationsAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, all }: { ids?: string[]; all?: boolean }) => markNotificationsAsRead(ids, all),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: afterKeys.all });
    },
  });
}

export function useStoreInfo() {
  return useQuery({
    queryKey: afterKeys.storeInfo(),
    queryFn: () => getStoreInfo(),
  });
}
