"use client";

import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductsQuery } from "@/lib/api";

export type SortValue = NonNullable<ProductsQuery["sort"]>;

export interface PricePreset {
  key: string;
  label: string;
  min?: number;
  max?: number;
}

// Rentang harga preset (rupiah). Dipetakan ke min_price/max_price kontrak.
export const pricePresets: PricePreset[] = [
  { key: "all", label: "Semua harga" },
  { key: "lt1", label: "Di bawah Rp1 jt", max: 999999 },
  { key: "1-3", label: "Rp1–3 jt", min: 1000000, max: 3000000 },
  { key: "3-5", label: "Rp3–5 jt", min: 3000000, max: 5000000 },
  { key: "gt5", label: "Di atas Rp5 jt", min: 5000001 },
];

const sortOptions: { value: SortValue; label: string }[] = [
  { value: "newest", label: "Terbaru" },
  { value: "price_asc", label: "Harga terendah" },
  { value: "price_desc", label: "Harga tertinggi" },
];

export function FilterBar({
  sort,
  priceKey,
  onSort,
  onPrice,
}: {
  sort: SortValue;
  priceKey: string;
  onSort: (v: SortValue) => void;
  onPrice: (key: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 border-y border-neutral-200 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 hidden items-center gap-1.5 text-sm text-neutral-500 sm:inline-flex">
          <SlidersHorizontal className="h-4 w-4" />
          Harga
        </span>
        {pricePresets.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onPrice(p.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              priceKey === p.key
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 text-neutral-600 hover:border-neutral-400",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="sort" className="text-sm text-neutral-500">
          Urutkan
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => onSort(e.target.value as SortValue)}
          className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
