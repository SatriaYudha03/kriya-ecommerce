import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProfile,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getProvinces,
} from "./api";
import type { AddressInput } from "./types";

export const customerKeys = {
  all: ["customer"] as const,
  profile: () => [...customerKeys.all, "profile"] as const,
  addresses: () => [...customerKeys.all, "addresses"] as const,
  provinces: () => [...customerKeys.all, "provinces"] as const,
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

import { 
  getAdminCustomers, getAdminCustomerDetail, getAdminSettings, 
  updateAdminSettings, getPublicStoreSettings,
  getAdminShippingZones, updateAdminShippingMethod
} from "./api";
import type { AdminSettings } from "./types";

export const adminCustomerKeys = {
  all: ["admin", "customer"] as const,
  lists: () => [...adminCustomerKeys.all, "list"] as const,
  list: (q: string, sort: string, page: number, limit: number) => [...adminCustomerKeys.lists(), { q, sort, page, limit }] as const,
  details: () => [...adminCustomerKeys.all, "detail"] as const,
  detail: (id: string) => [...adminCustomerKeys.details(), id] as const,
  settings: () => ["admin", "settings"] as const,
  publicStore: () => ["public", "store"] as const,
};

export function useAdminCustomers(q: string, sort: string, page: number, limit: number) {
  return useQuery({
    queryKey: adminCustomerKeys.list(q, sort, page, limit),
    queryFn: () => getAdminCustomers(q, sort, page, limit),
  });
}

export function useAdminCustomerDetail(id: string) {
  return useQuery({
    queryKey: adminCustomerKeys.detail(id),
    queryFn: () => getAdminCustomerDetail(id),
    enabled: !!id,
  });
}

export function useAdminSettings() {
  return useQuery({
    queryKey: adminCustomerKeys.settings(),
    queryFn: getAdminSettings,
  });
}

export function useUpdateAdminSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminSettings) => updateAdminSettings(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminCustomerKeys.settings() });
      qc.invalidateQueries({ queryKey: adminCustomerKeys.publicStore() });
    },
  });
}

export function usePublicStoreSettings() {
  return useQuery({
    queryKey: adminCustomerKeys.publicStore(),
    queryFn: getPublicStoreSettings,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminShippingZones() {
  return useQuery({
    queryKey: [...adminCustomerKeys.all, "shippingZones"] as const,
    queryFn: getAdminShippingZones,
  });
}

export function useUpdateShippingMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        base_cost: number;
        per_kg_cost: number;
        free_shipping_min_subtotal: number | null;
      };
    }) => updateAdminShippingMethod(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...adminCustomerKeys.all, "shippingZones"] });
    },
  });
}


