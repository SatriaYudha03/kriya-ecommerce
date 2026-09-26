import { request, USE_FIXTURES } from "../http";
import type { Envelope } from "../http";
import type { Profile, UpdateProfilePayload, Cart, Address, AddressInput, Province } from "./types";
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
