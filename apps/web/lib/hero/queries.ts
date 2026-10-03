import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminHeroSlides, saveAdminHeroSlides } from "./api";
import type { HeroSlideInput } from "./types";

export const heroKeys = {
  admin: ["admin", "hero-slides"] as const,
};

export function useAdminHeroSlides() {
  return useQuery({ queryKey: heroKeys.admin, queryFn: getAdminHeroSlides });
}

export function useSaveHeroSlides() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slides: HeroSlideInput[]) => saveAdminHeroSlides(slides),
    onSuccess: (data) => qc.setQueryData(heroKeys.admin, data),
  });
}
