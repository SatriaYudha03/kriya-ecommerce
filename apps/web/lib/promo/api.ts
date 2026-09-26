import { request } from "../http";
import type { Envelope, ListEnvelope } from "../http";
import type { AdminStats, Coupon, CouponPayload, CouponRedemption } from "./types";

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
