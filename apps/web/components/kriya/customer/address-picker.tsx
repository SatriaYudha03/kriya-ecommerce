import type { ShippingAddress } from "@/lib/types";
export interface AddressPickerProps { value: string | null; onChange: (address: ShippingAddress) => void; }
export function AddressPicker({ value, onChange }: AddressPickerProps) { return null; }
