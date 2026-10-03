import { request, USE_FIXTURES } from "../http";
import type { Envelope, ListEnvelope } from "../http";
import type { Profile, UpdateProfilePayload, Cart, Address, AddressInput, Province, ContinuePaymentResponse } from "./types";
import { fixtures } from "./fixtures";

export async function getProfile(): Promise<Profile> {
  if (USE_FIXTURES) return fixtures.profile;
  const { data } = await request<Envelope<Profile>>("/api/v1/profile", { auth: true });
  return data;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<Profile> {
  if (USE_FIXTURES) {
    return new Promise((resolve) => setTimeout(() => resolve(payload), 400));
  }
  const { data } = await request<Envelope<Profile>>("/api/v1/profile", {
    method: "PUT",
    body: payload,
    auth: true,
  });
  return data;
}

export async function getCart(): Promise<Cart> {
  if (USE_FIXTURES) return fixtures.cart;
  const { data } = await request<Envelope<Cart>>("/api/v1/cart", { auth: true });
  return data;
}

export async function updateCart(items: { variant_id: string; qty: number }[]): Promise<Cart> {
  if (USE_FIXTURES) {
    return new Promise((resolve) => setTimeout(() => resolve(fixtures.cart), 500));
  }
  const { data } = await request<Envelope<Cart>>("/api/v1/cart", {
    method: "PUT",
    body: { items },
    auth: true
  });
  return data;
}

export async function mergeCart(items: { variant_id: string; qty: number }[]): Promise<Cart> {
  if (USE_FIXTURES) {
    return new Promise((resolve) => setTimeout(() => resolve(fixtures.cart), 500));
  }
  if (!items || items.length === 0) {
     return getCart();
  }
  const { data } = await request<Envelope<Cart>>("/api/v1/cart/merge", {
    method: "POST",
    body: { items },
    auth: true
  });
  return data;
}


export async function getAddresses(): Promise<Address[]> {
  const { data } = await request<Envelope<Address[]>>("/api/v1/addresses", { auth: true });
  return data;
}

export async function createAddress(payload: AddressInput): Promise<Address> {
  const { data } = await request<Envelope<Address>>("/api/v1/addresses", {
    method: "POST",
    body: payload,
    auth: true,
  });
  return data;
}

export async function updateAddress(id: string, payload: AddressInput): Promise<Address> {
  const { data } = await request<Envelope<Address>>(`/api/v1/addresses/${id}`, {
    method: "PUT",
    body: payload,
    auth: true,
  });
  return data;
}

export async function deleteAddress(id: string): Promise<void> {
  await request<Envelope<unknown>>(`/api/v1/addresses/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function setDefaultAddress(id: string): Promise<Address> {
  const { data } = await request<Envelope<Address>>(`/api/v1/addresses/${id}/default`, {
    method: "POST",
    auth: true,
  });
  return data;
}

export async function getProvinces(): Promise<Province[]> {
  const { data } = await request<Envelope<Province[]>>("/api/v1/shipping/provinces");
  return data;
}

export async function continuePayment(orderId: string): Promise<ContinuePaymentResponse> {
  const { data } = await request<Envelope<ContinuePaymentResponse>>(`/api/v1/orders/${orderId}/pay`, {
    method: "POST",
    auth: true,
  });
  return data;
}

import type { 
  AdminCustomerListItem, AdminCustomerDetailItem, 
  AdminSettings, PublicStoreSettings, ShippingZone
} from "./types";

export async function getAdminCustomers(
  query = "",
  sort = "newest",
  page = 1,
  limit = 10
): Promise<{ data: AdminCustomerListItem[]; meta: { page: number, limit: number, total: number } }> {
  if (USE_FIXTURES) return fixtures.adminCustomers(page, limit);
  const searchParams = new URLSearchParams({
    q: query,
    sort,
    page: page.toString(),
    limit: limit.toString(),
  });
  const res = await request<ListEnvelope<AdminCustomerListItem>>(`/api/v1/admin/customers?${searchParams.toString()}`, { auth: true });
  return { data: res.data, meta: res.meta };
}

export async function getAdminCustomerDetail(id: string): Promise<AdminCustomerDetailItem> {
  if (USE_FIXTURES) return fixtures.adminCustomerDetail;
  const { data } = await request<Envelope<AdminCustomerDetailItem>>(`/api/v1/admin/customers/${id}`, { auth: true });
  return data;
}

export async function getAdminSettings(): Promise<AdminSettings> {
  if (USE_FIXTURES) return fixtures.adminSettings;
  const { data } = await request<Envelope<AdminSettings>>("/api/v1/admin/settings", { auth: true });
  return data;
}

export async function updateAdminSettings(payload: AdminSettings): Promise<void> {
  if (USE_FIXTURES) return;
  await request("/api/v1/admin/settings", {
    method: "PUT",
    body: payload,
    auth: true,
  });
}

export async function getPublicStoreSettings(): Promise<PublicStoreSettings> {
  if (USE_FIXTURES) return fixtures.publicStoreSettings;
  const { data } = await request<Envelope<PublicStoreSettings>>("/api/v1/store");
  return data;
}

export async function getAdminShippingZones(): Promise<ShippingZone[]> {
  const res = await request<Envelope<ShippingZone[]>>("/api/v1/admin/shipping/zones", { auth: true });
  return res.data || [];
}

export async function updateAdminShippingMethod(
  id: string,
  payload: {
    base_cost: number;
    per_kg_cost: number;
    free_shipping_min_subtotal: number | null;
  }
): Promise<void> {
  await request(`/api/v1/admin/shipping/methods/${id}`, {
    method: "PUT",
    body: payload,
    auth: true,
  });
}

