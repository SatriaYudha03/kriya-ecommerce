import { request } from "../http";
import type { Envelope, ListEnvelope, ApiErrorBody } from "../http";
import type { AdminStats, Coupon, CouponPayload, CouponRedemption } from "./types";
import type { QuoteCoupon } from "../types";

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await request<Envelope<AdminStats>>("/api/v1/admin/stats", { auth: true });
  return data;
}

export async function getAdminCoupons(
  query: { search?: string; status?: string; page?: number; limit?: number } = {},
): Promise<ListEnvelope<Coupon>> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  return request<ListEnvelope<Coupon>>(`/api/v1/admin/coupons?${params.toString()}`, {
    auth: true,
  });
}

export async function getAdminCoupon(id: string): Promise<Coupon> {
  const { data } = await request<Envelope<Coupon>>(`/api/v1/admin/coupons/${id}`, {
    auth: true,
  });
  return data;
}

export async function createCoupon(payload: CouponPayload): Promise<Coupon> {
  const { data } = await request<Envelope<Coupon>>("/api/v1/admin/coupons", {
    method: "POST",
    body: payload,
    auth: true,
  });
  return data;
}

export async function updateCoupon(id: string, payload: CouponPayload): Promise<Coupon> {
  const { data } = await request<Envelope<Coupon>>(`/api/v1/admin/coupons/${id}`, {
    method: "PUT",
    body: payload,
    auth: true,
  });
  return data;
}

export async function deleteCoupon(id: string): Promise<void> {
  await request<Envelope<unknown>>(`/api/v1/admin/coupons/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function getAdminCouponRedemptions(
  id: string,
  page = 1,
  limit = 20,
): Promise<ListEnvelope<CouponRedemption>> {
  return request<ListEnvelope<CouponRedemption>>(
    `/api/v1/admin/coupons/${id}/redemptions?page=${page}&limit=${limit}`,
    { auth: true },
  );
}


export interface PublicCoupon {
  id: string;
  code: string;
  description_i18n: Record<string, string>;
  discount_type: string;
  amount: number;
  ends_at: string | null;
}

export interface ValidateCouponResponse {
  Code: string;
  code?: string;
  DiscountType: string;
  discount_type?: string;
}

export async function getPublicCoupons(): Promise<PublicCoupon[]> {
  const { data } = await request<Envelope<PublicCoupon[]>>("/api/v1/public/coupons/public");
  return data;
}

export async function validateCoupon(code: string, items: { variant_id: string; qty: number }[]): Promise<QuoteCoupon> {
  try {
    const { data } = await request<Envelope<ValidateCouponResponse>>("/api/v1/public/coupons/validate", {
      method: "POST",
      body: { code, lines: items },
      auth: true,
    });
    return {
      code: data.Code || data.code || code,
      valid: true,
      reason: "",
      discount_type: data.DiscountType || data.discount_type || "percent",
    };
  } catch (err: unknown) {
    const errorBody = (err as { response?: ApiErrorBody })?.response;
    if (errorBody && errorBody.error) {
      return {
        code,
        valid: false,
        reason: errorBody.error.code,
        discount_type: "",
      };
    }
    return {
      code,
      valid: false,
      reason: "internal",
      discount_type: "",
    };
  }
}

import type { ReportSummary, ReportSalesItem, ReportTopProduct } from "./types";

export async function getReportSummary(from?: string, to?: string): Promise<ReportSummary> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const { data } = await request<Envelope<ReportSummary>>(`/api/v1/admin/reports/summary?${params.toString()}`, { auth: true });
  return data;
}

export async function getReportSales(from?: string, to?: string, interval?: string): Promise<ReportSalesItem[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (interval) params.set("interval", interval);
  const { data } = await request<Envelope<ReportSalesItem[]>>(`/api/v1/admin/reports/sales?${params.toString()}`, { auth: true });
  return data;
}

export async function getReportTopProducts(from?: string, to?: string, limit?: number): Promise<ReportTopProduct[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (limit) params.set("limit", String(limit));
  const { data } = await request<Envelope<ReportTopProduct[]>>(`/api/v1/admin/reports/top-products?${params.toString()}`, { auth: true });
  return data;
}

