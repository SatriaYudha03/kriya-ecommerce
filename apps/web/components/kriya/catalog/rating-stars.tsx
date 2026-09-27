import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "../language-provider";

export interface RatingStarsProps {
  value: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}

export function RatingStars({ value, count, size = "md", className }: RatingStarsProps) {
  const { t } = useLanguage();
  const starClass = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const textClass = size === "sm" ? "text-xs" : "text-sm";

  const fullStars = Math.floor(value);
  const hasHalfStar = value - fullStars >= 0.5;
  const emptyStars = Math.max(0, 5 - Math.ceil(value));

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      title={`${value.toFixed(1)} ${t("catalog.rating.label")}`}
    >
      <div className="flex">
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star key={`full-${i}`} className={cn(starClass, "fill-amber-400 text-amber-400")} />
        ))}
        {hasHalfStar && <StarHalf className={cn(starClass, "fill-amber-400 text-amber-400")} />}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star key={`empty-${i}`} className={cn(starClass, "text-muted-foreground/30")} />
        ))}
      </div>
      {count !== undefined && count > 0 && (
        <span className={cn("text-muted-foreground", textClass)}>({count})</span>
      )}
    </div>
  );
}
