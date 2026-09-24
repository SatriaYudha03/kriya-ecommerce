import type { QuoteCoupon } from "@/lib/types";
export interface CouponInputProps { items: { variant_id: string; qty: number }[]; appliedCode: string | null; onApplied: (r: QuoteCoupon) => void; onRemoved: () => void; }
export function CouponInput({ items, appliedCode, onApplied, onRemoved }: CouponInputProps) { return null; }
