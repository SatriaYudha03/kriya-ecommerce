import { supabase } from "../supabase";
import type { Address, AddressInput, Province } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function fetchWithAuth<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const json = await res.json().catch(() => null);
  
  if (!res.ok) {
    throw new Error(json?.error?.message || "Terjadi kesalahan API");
  }
  
  return (json as { data: T })?.data;
}

export async function getAddresses(): Promise<Address[]> {
  return fetchWithAuth<Address[]>("/api/v1/addresses");
}

export async function createAddress(payload: AddressInput): Promise<Address> {
  return fetchWithAuth<Address>("/api/v1/addresses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAddress(id: string, payload: AddressInput): Promise<Address> {
  return fetchWithAuth<Address>(`/api/v1/addresses/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteAddress(id: string): Promise<void> {
  await fetchWithAuth(`/api/v1/addresses/${id}`, {
    method: "DELETE",
  });
}

export async function setDefaultAddress(id: string): Promise<Address> {
  return fetchWithAuth<Address>(`/api/v1/addresses/${id}/default`, {
    method: "POST",
  });
}

export async function getProvinces(): Promise<Province[]> {
  const res = await fetch(`${API_URL}/api/v1/shipping/provinces`);
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message || "Gagal mengambil provinsi");
  return json?.data as Province[];
}
