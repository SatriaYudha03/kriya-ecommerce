import type { QuoteShippingOption } from "@/lib/types";
export interface ShippingMethodPickerProps { options: QuoteShippingOption[]; value: string | null; onChange: (methodId: string) => void; loading?: boolean; }
export function ShippingMethodPicker({ options, value, onChange, loading }: ShippingMethodPickerProps) { return null; }
