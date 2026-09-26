"use client";

import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductsQuery } from "@/lib/api";
import type { MessageKey } from "@/lib/i18n";
import { useLanguage } from "./language-provider";
import { useTags, useAttributes } from "@/lib/catalog/queries";

export type SortValue = NonNullable<ProductsQuery["sort"]>;

export interface PricePreset {
  key: string;
  labelKey: MessageKey;
  min?: number;
  max?: number;
}

// Rentang harga preset (rupiah). Dipetakan ke min_price/max_price kontrak.
export const pricePresets: PricePreset[] = [
  { key: "all", labelKey: "filter.price.all" },
  { key: "lt1", labelKey: "filter.price.lt1", max: 999999 },
  { key: "1-3", labelKey: "filter.price.1-3", min: 1000000, max: 3000000 },
  { key: "3-5", labelKey: "filter.price.3-5", min: 3000000, max: 5000000 },
  { key: "gt5", labelKey: "filter.price.gt5", min: 5000001 },
];

const sortOptions: { value: SortValue; labelKey: MessageKey }[] = [
  { value: "newest", labelKey: "sort.newest" },
  { value: "best_selling", labelKey: "catalog.sort.best_selling" as MessageKey },
  { value: "rating", labelKey: "catalog.sort.rating" as MessageKey },
  { value: "price_asc", labelKey: "sort.price_asc" },
  { value: "price_desc", labelKey: "sort.price_desc" },
];

export function FilterBar({
  sort,
  priceKey,
  onSale,
  inStock,
  tagsParam,
  attrsParam,
  categorySlug,
  onSort,
  onPrice,
  onSaleChange,
  onInStockChange,
  onTagsChange,
  onAttrsChange,
}: {
  sort: SortValue;
  priceKey: string;
  onSale?: boolean;
  inStock?: boolean;
  tagsParam?: string;
  attrsParam?: string;
  categorySlug?: string;
  onSort: (v: SortValue) => void;
  onPrice: (key: string) => void;
  onSaleChange?: (v: boolean) => void;
  onInStockChange?: (v: boolean) => void;
  onTagsChange?: (v: string) => void;
  onAttrsChange?: (v: string) => void;
}) {
  const { t } = useLanguage();
  const { data: tags = [] } = useTags();
  const { data: attributes = [] } = useAttributes(categorySlug);

  const selectedTags = tagsParam ? tagsParam.split(",") : [];
  const selectedAttrs = attrsParam ? attrsParam.split(",") : [];

  const toggleTag = (slug: string) => {
    if (!onTagsChange) return;
    const newTags = selectedTags.includes(slug)
      ? selectedTags.filter((s) => s !== slug)
      : [...selectedTags, slug];
    onTagsChange(newTags.join(","));
  };

  const toggleAttr = (attrSlug: string, termSlug: string) => {
    if (!onAttrsChange) return;
    const val = `${attrSlug}.${termSlug}`;
    const newAttrs = selectedAttrs.includes(val)
      ? selectedAttrs.filter((s) => s !== val)
      : [...selectedAttrs, val];
    onAttrsChange(newAttrs.join(","));
  };
  return (
    <>
      <div className="flex flex-col gap-4 border-y border-neutral-200 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 hidden items-center gap-1.5 text-sm text-neutral-500 sm:inline-flex">
          <SlidersHorizontal className="h-4 w-4" />
          {t("filter.price")}
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
                : "border-neutral-200 bg-transparent text-neutral-600 hover:border-neutral-300",
            )}
          >
            {t(p.labelKey)}
          </button>
        ))}
        {onSaleChange && (
          <button
            type="button"
            onClick={() => onSaleChange(!onSale)}
            className={cn(
              "ml-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              onSale
                ? "border-red-600 bg-red-600 text-white"
                : "border-neutral-200 bg-transparent text-red-600 hover:border-red-600"
            )}
          >
            SALE
          </button>
        )}
        {onInStockChange && (
          <button
            type="button"
            onClick={() => onInStockChange(!inStock)}
            className={cn(
              "ml-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              inStock
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 bg-transparent text-neutral-600 hover:border-neutral-300"
            )}
          >
            In Stock
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="sort" className="text-sm text-neutral-500">
          {t("filter.sort")}
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => onSort(e.target.value as SortValue)}
          className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {t(o.labelKey)}
            </option>
          ))}
        </select>
      </div>
    </div>
    <div className="flex flex-wrap gap-x-6 gap-y-4 pt-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-neutral-700">Tags:</span>
          {tags.map((t) => (
            <button
              key={t.slug}
              type="button"
              onClick={() => toggleTag(t.slug)}
              className={cn(
                "rounded-md border px-2 py-1 text-xs transition-colors",
                selectedTags.includes(t.slug)
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-neutral-200 bg-transparent text-neutral-600 hover:border-neutral-300"
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
      {attributes.map((a) => (
        <div key={a.slug} className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-neutral-700">{a.name}:</span>
          {a.terms.map((t) => {
            const val = `${a.slug}.${t.slug}`;
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => toggleAttr(a.slug, t.slug)}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs transition-colors",
                  selectedAttrs.includes(val)
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-neutral-200 bg-transparent text-neutral-600 hover:border-neutral-300"
                )}
              >
                {t.name} ({t.product_count})
              </button>
            );
          })}
        </div>
      ))}
    </div>
  </>
  );
}
