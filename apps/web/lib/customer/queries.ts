import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProfile,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getProvinces,
  getWishlist,
  putWishlist,
  deleteWishlist,
} from "./api";
import type { AddressInput } from "./types";

export const customerKeys = {
  all: ["customer"] as const,
  profile: () => [...customerKeys.all, "profile"] as const,
  addresses: () => [...customerKeys.all, "addresses"] as const,
  provinces: () => [...customerKeys.all, "provinces"] as const,
  wishlist: () => [...customerKeys.all, "wishlist"] as const,
};

export function useProfile(enabled = true) {
  return useQuery({
    queryKey: customerKeys.profile(),
    queryFn: getProfile,
    enabled,
    staleTime: 60_000,
  });
}

export function useAddresses(enabled = true) {
  return useQuery({
    queryKey: customerKeys.addresses(),
    queryFn: getAddresses,
    enabled,
  });
}

export function useProvinces() {
  return useQuery({
    queryKey: customerKeys.provinces(),
    queryFn: getProvinces,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useAddressMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: customerKeys.addresses() });

  const create = useMutation({ mutationFn: createAddress, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AddressInput }) => updateAddress(id, payload),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteAddress, onSuccess: invalidate });
  const setAsDefault = useMutation({ mutationFn: setDefaultAddress, onSuccess: invalidate });

  return { create, update, remove, setAsDefault };
}

export function useWishlist(enabled = true) {
  return useQuery({
    queryKey: customerKeys.wishlist(),
    queryFn: getWishlist,
    enabled,
  });
}

export function useWishlistMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: customerKeys.wishlist() });

  const add = useMutation({ mutationFn: putWishlist, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: deleteWishlist, onSuccess: invalidate });

  return { add, remove };
}

