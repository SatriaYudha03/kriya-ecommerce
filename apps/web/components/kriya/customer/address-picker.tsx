"use client";

import { useAddresses } from "@/lib/customer/queries";
import type { Address } from "@/lib/customer/types";

export interface AddressPickerProps {
  value: string | null;
  onChange: (address: Address) => void;
}

export function AddressPicker({ value, onChange }: AddressPickerProps) {
  const { data: addresses, isLoading } = useAddresses();

  if (isLoading) {
    return <div className="animate-pulse h-20 bg-neutral-100 rounded-lg" />;
  }

  if (!addresses || addresses.length === 0) {
    return (
      <div className="p-4 border border-neutral-200 rounded-lg text-sm text-neutral-500 text-center">
        Belum ada alamat pengiriman.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {addresses.map((addr) => (
        <label
          key={addr.id}
          className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:border-brand transition-colors ${
            value === addr.id ? "border-brand bg-brand/5" : "border-neutral-200 bg-white"
          }`}
        >
          <input
            type="radio"
            name="shipping_address"
            className="mt-1"
            checked={value === addr.id}
            onChange={() => onChange(addr)}
          />
          <div className="flex-1 text-sm">
            <div className="font-medium text-neutral-900">
              {addr.label} {addr.is_default && <span className="ml-2 text-xs text-brand font-normal bg-brand/10 px-2 py-0.5 rounded-full">Utama</span>}
            </div>
            <div className="mt-1 font-medium">{addr.recipient} ({addr.phone})</div>
            <div className="mt-1 text-neutral-600">
              {addr.address_line}
            </div>
            <div className="text-neutral-600">
              {addr.city}, {addr.province} {addr.postal_code}
            </div>
          </div>
        </label>
      ))}
    </div>
  );
}
