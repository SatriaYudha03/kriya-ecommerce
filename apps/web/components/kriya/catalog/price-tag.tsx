import { formatRupiah } from "@/lib/format";

export interface PriceTagProps {
  price: number;
  regularPrice?: number | null;
  size?: "sm" | "md" | "lg";
}

export function PriceTag({ price, regularPrice, size = "md" }: PriceTagProps) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg font-bold",
  };

  const regSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className="flex items-center gap-2">
      <span className={sizeClasses[size]}>{formatRupiah(price)}</span>
      {regularPrice != null && regularPrice > price && (
        <span className={`text-muted-foreground line-through ${regSizeClasses[size]}`}>
          {formatRupiah(regularPrice)}
        </span>
      )}
    </div>
  );
}
