import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrders, getOrder, getAdminOrders, updateAdminOrderStatus } from "./api";
import { useLanguage } from "@/components/kriya/language-provider";
import type { AdminOrdersQuery, OrderStatus } from "./types";
import { toast } from "sonner";
import { ApiError } from "../http";
import { promoKeys } from "../promo/queries";

export const afterKeys = {
  all: ["after"] as const,
  orders: (locale: string) => [...afterKeys.all, "orders", locale] as const,
  order: (id: string, locale: string) => [...afterKeys.all, "order", id, locale] as const,
  adminOrders: (query: AdminOrdersQuery) => [...afterKeys.all, "admin-orders", query] as const,
};

export function useOrders() {
  const { locale } = useLanguage();
  return useQuery({
    queryKey: afterKeys.orders(locale),
    queryFn: getOrders,
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
