import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAdminStats,
  getAdminCoupons,
  getAdminCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getAdminCouponRedemptions,
} from "./api";
import type { CouponPayload } from "./types";
import { ApiError } from "../http";

export const promoKeys = {
  all: ["promo"] as const,
  stats: () => [...promoKeys.all, "admin-stats"] as const,
  coupons: () => [...promoKeys.all, "admin-coupons"] as const,
  coupon: (id: string) => [...promoKeys.all, "admin-coupon", id] as const,
  couponRedemptions: (id: string) => [...promoKeys.all, "admin-coupon-redemptions", id] as const,
};

export function useAdminStats(enabled = true) {
  return useQuery({
    queryKey: promoKeys.stats(),
    queryFn: getAdminStats,
    enabled,
    retry: false,
    staleTime: 30_000,
  });
}

export function useAdminCoupons(query: { search?: string; status?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: [...promoKeys.coupons(), query],
    queryFn: () => getAdminCoupons(query),
    retry: false,
  });
}

export function useAdminCoupon(id: string, enabled = true) {
  return useQuery({
    queryKey: promoKeys.coupon(id),
    queryFn: () => getAdminCoupon(id),
    enabled: enabled && Boolean(id),
    retry: false,
  });
}

export function useAdminCouponRedemptions(id: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: [...promoKeys.couponRedemptions(id), page, limit],
    queryFn: () => getAdminCouponRedemptions(id, page, limit),
    enabled: Boolean(id),
  });
}

export function useSaveCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: CouponPayload }) =>
      id ? updateCoupon(id, payload) : createCoupon(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: promoKeys.coupons() });
      qc.invalidateQueries({ queryKey: promoKeys.all });
      toast.success("Kupon berhasil disimpan");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan kupon");
    },
  });
}

export function useDeleteCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: promoKeys.coupons() });
      toast.success("Kupon berhasil dihapus");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Gagal menghapus kupon");
    },
  });
}
