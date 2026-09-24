import { formatRupiah } from "@/lib/format";
export interface PriceTagProps { price: number; regularPrice?: number | null; size?: "sm" | "md" | "lg"; }
export function PriceTag({ price, regularPrice, size = "md" }: PriceTagProps) { return <span>{formatRupiah(price)}</span>; }
