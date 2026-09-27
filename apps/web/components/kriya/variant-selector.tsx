"use client";

import type { ProductVariant } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "./language-provider";

const colorHex: Record<string, string> = {
  natural: "#c9a97e",
  walnut: "#5b4636",
  hitam: "#1f1f1f",
  putih: "#f2f2ef",
  "abu-abu": "#9ca3af",
  krem: "#e7dbc6",
  kuningan: "#b08d55",
  "hijau olive": "#6b7040",
  arang: "#3a3a3a",
  pasir: "#d9c7a3",
};

export function VariantSelector({
  variants,
  selectedId,
  onSelect,
}: {
  variants: ProductVariant[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <div>
      <p className="text-sm font-medium text-neutral-900">{t("catalog.variant.label")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {variants.map((v) => {
          const selected = v.id === selectedId;
          const soldOut = v.stock <= 0;
          const label = v.size ? `${v.color} · ${v.size}` : v.color;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelect(v.id)}
              disabled={soldOut}
              aria-pressed={selected}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                selected
                  ? "border-neutral-900 ring-1 ring-neutral-900"
                  : "border-neutral-300 hover:border-neutral-400",
                soldOut && "cursor-not-allowed opacity-40",
              )}
            >
              <span
                aria-hidden
                className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: colorHex[v.color] ?? "#d1d5db" }}
              />
              <span className="capitalize text-neutral-800">{label}</span>
              {soldOut && <span className="text-xs text-neutral-500">{t("catalog.variant.soldOut")}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
