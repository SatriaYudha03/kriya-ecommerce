"use client";

import { useAddresses } from "@/lib/customer/queries";
import { useLanguage } from "@/components/kriya/language-provider";
import type { Address } from "@/lib/customer/types";

export interface AddressPickerProps {
  value: string | null;
  onChange: (address: Address) => void;
}

export function AddressPicker({ value, onChange }: AddressPickerProps) {
  const { t } = useLanguage();
  const { data: addresses, isLoading } = useAddresses();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse h-20 bg-neutral-100 rounded-lg" />
        <div className="animate-pulse h-20 bg-neutral-100 rounded-lg" />
      </div>
    );
  }

  if (!addresses || addresses.length === 0) {
    return (
      <div className="p-4 border border-neutral-200 rounded-lg text-sm text-neutral-500 text-center">
        {t("customer.addressPicker.empty")}
      </div>
    );
  }

  return (
    <div className="space-y-3" role="radiogroup" aria-label={t("customer.addresses.title")}>
      {addresses.map((addr) => {
        const isSelected = value === addr.id;
        return (
          <label
            key={addr.id}
            htmlFor={`address-picker-${addr.id}`}
            className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:border-brand transition-colors focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-1 ${
              isSelected ? "border-brand bg-brand/5" : "border-neutral-200 bg-white"
            }`}
          >
            <input
              id={`address-picker-${addr.id}`}
              type="radio"
              name="shipping_address"
              className="mt-1 h-4 w-4 text-brand focus:ring-brand"
              checked={isSelected}
              onChange={() => onChange(addr)}
            />
            <div className="flex-1 text-sm">
              <div className="font-medium text-neutral-900 flex items-center gap-2">
                <span>{addr.label}</span>
                {addr.is_default && (
                  <span className="text-xs text-brand font-semibold bg-brand/10 px-2 py-0.5 rounded-full">
                    {t("customer.addressPicker.defaultBadge")}
                  </span>
                )}
              </div>
              <div className="mt-1 font-medium text-neutral-800">{addr.recipient} ({addr.phone})</div>
              <div className="mt-1 text-neutral-600 line-clamp-2">
                {addr.address_line}
              </div>
              <div className="text-neutral-600">
                {addr.district ? `${addr.district}, ` : ""}{addr.city}, {addr.province} {addr.postal_code}
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}
