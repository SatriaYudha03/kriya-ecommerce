// Hook TanStack Query untuk panel admin (M6). Query + mutation lewat lib/api.ts.
// Mutasi meng-invalidate cache terkait & memunculkan toast (sonner).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAdminStats,
  getAdminOrders,
  getAdminProduct,
  updateAdminOrderStatus,
  deleteProduct,
  ApiError,
} from "./api";
import type { AdminOrdersQuery, OrderStatus } from "./types";

export function useAdminStats(enabled = true) {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: getAdminStats,
    enabled,
    retry: false,
    staleTime: 30_000,
  });
}

export function useAdminOrders(query: AdminOrdersQuery = {}) {
  return useQuery({
    queryKey: ["admin-orders", query],
    queryFn: () => getAdminOrders(query),
    retry: false,
  });
}

export function useAdminProduct(id: string, enabled = true) {
  return useQuery({
    queryKey: ["admin-product", id],
    queryFn: () => getAdminProduct(id),
    enabled: enabled && Boolean(id),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateAdminOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Status pesanan diperbarui");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Gagal memperbarui status");
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Produk dihapus");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Gagal menghapus produk");
    },
  });
}
