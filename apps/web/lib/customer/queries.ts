import { useQuery } from "@tanstack/react-query";
import { getProfile } from "./api";
import type { ShippingAddress } from "./types";

export const customerKeys = {
  all: ["customer"] as const,
  profile: () => [...customerKeys.all, "profile"] as const,
  addresses: () => [...customerKeys.all, "addresses"] as const,
};

export function useProfile(enabled = true) {
  return useQuery({
    queryKey: customerKeys.profile(),
    queryFn: getProfile,
    enabled,
    staleTime: 60_000,
  });
}

export function useAddresses() {
  return useQuery({
    queryKey: customerKeys.addresses(),
    queryFn: async (): Promise<ShippingAddress[]> => [], // STUB
    enabled: false,
  });
}
