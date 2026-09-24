import { request, USE_FIXTURES } from "../http";
import type { Envelope } from "../http";
import type { Profile, UpdateProfilePayload, Cart } from "./types";
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
