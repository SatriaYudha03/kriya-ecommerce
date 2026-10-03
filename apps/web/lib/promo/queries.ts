import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAdminAccess,
  getAdminStats,
  getAdminCoupons,
  getAdminCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getAdminCouponRedemptions,
  getReportSummary,
  getReportSales,
  getReportTopProducts,
  getReportBreakdown,
} from "./api";
import type { CouponPayload } from "./types";
import { ApiError } from "../http";

export const promoKeys = {
  all: ["promo"] as const,
  stats: () => [...promoKeys.all, "admin-stats"] as const,
  coupons: () => [...promoKeys.all, "admin-coupons"] as const,
  coupon: (id: string) => [...promoKeys.all, "admin-coupon", id] as const,
  couponRedemptions: (id: string) => [...promoKeys.all, "admin-coupon-redemptions", id] as const,
  report: (kind: string, from: string, to: string, extra?: string) =>
    [...promoKeys.all, "admin-report", kind, from, to, extra ?? ""] as const,
};

// Probe akses ringan untuk AdminGuard (tanpa query agregat berat).
export function useAdminAccess(enabled = true) {
  return useQuery({
    queryKey: [...promoKeys.all, "admin-access"] as const,
    queryFn: getAdminAccess,
    enabled,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useAdminStats(enabled = true) {
  return useQuery({
    queryKey: promoKeys.stats(),
    queryFn: getAdminStats,
    enabled,
    retry: false,
    staleTime: 30_000,
  });
}

// Laporan per periode untuk dashboard admin. from/to: YYYY-MM-DD (WIB).
export function useReportSummary(from: string, to: string) {
  return useQuery({
    queryKey: promoKeys.report("summary", from, to),
    queryFn: () => getReportSummary(from, to),
    retry: false,
    staleTime: 60_000,
  });
}

export function useReportSales(from: string, to: string, interval: "day" | "week" | "month") {
  return useQuery({
    queryKey: promoKeys.report("sales", from, to, interval),
    queryFn: () => getReportSales(from, to, interval),
    retry: false,
    staleTime: 60_000,
  });
}

export function useReportTopProducts(from: string, to: string, limit: number) {
  return useQuery({
    queryKey: promoKeys.report("top-products", from, to, String(limit)),
    queryFn: () => getReportTopProducts(from, to, limit),
    retry: false,
    staleTime: 60_000,
  });
}

export function useReportBreakdown(from: string, to: string) {
  return useQuery({
    queryKey: promoKeys.report("breakdown", from, to),
    queryFn: () => getReportBreakdown(from, to),
    retry: false,
    staleTime: 60_000,
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
