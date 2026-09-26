import { useQuery } from "@tanstack/react-query";
import { getAdminStats } from "./api";

export const promoKeys = {
  all: ["promo"] as const,
  stats: () => [...promoKeys.all, "admin-stats"] as const,
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
