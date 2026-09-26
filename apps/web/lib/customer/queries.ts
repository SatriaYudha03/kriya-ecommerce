import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getProvinces,
} from "./api";
import type { AddressInput } from "./types";

export function useAddresses(enabled = true) {
  return useQuery({
    queryKey: ["addresses"],
    queryFn: getAddresses,
    enabled,
  });
}

export function useProvinces() {
  return useQuery({
    queryKey: ["provinces"],
    queryFn: getProvinces,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useAddressMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["addresses"] });
  };

  const create = useMutation({
    mutationFn: createAddress,
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AddressInput }) =>
      updateAddress(id, payload),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: deleteAddress,
    onSuccess: invalidate,
  });

  const setAsDefault = useMutation({
    mutationFn: setDefaultAddress,
    onSuccess: invalidate,
  });

  return { create, update, remove, setAsDefault };
}
