"use client";

import { useSearchParams } from "next/navigation";
import { useSearch } from "@/lib/queries";
import { ProductCard } from "@/components/kriya/product-card";
import { ProductGridSkeleton } from "@/components/kriya/product-grid";
import { EmptyState } from "@/components/kriya/empty-state";
import { Sparkles, Search as SearchIcon } from "lucide-react";
import { Suspense } from "react";
import type { SearchResponseItem } from "@/lib/types";

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const { data, isLoading } = useSearch(q);

  if (!q.trim()) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center text-neutral-500">
        Ketik sesuatu di kotak pencarian untuk mencari furniture.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Mencari: &quot;{q}&quot;</h1>
        <ProductGridSkeleton count={8} />
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20">
        <EmptyState
          title="Tidak ada hasil"
          hint={`Pencarian untuk "${q}" tidak menemukan produk apapun. Coba kata kunci yang lebih umum.`}
        />
      </div>
    );
  }

  const { items, meta } = { items: data.data, meta: data.meta };
  const isFallback = meta.mode === "keyword_fallback";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Hasil pencarian: &quot;{q}&quot;
        </h1>
        {isFallback ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
            <SearchIcon className="h-3 w-3" /> Pencarian kata kunci
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand-strong">
            <Sparkles className="h-3 w-3" /> Pencarian pintar AI
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-8">
        {items.map((item: SearchResponseItem) => (
          <ProductCard
            key={item.slug}
            product={{
              id: item.product_id,
              slug: item.slug,
              name: item.name,
              category_slug: "", // Not strictly used for display
              thumbnail_url: item.thumbnail_url,
              price_min: item.price_min,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center">Memuat...</div>}>
      <SearchResults />
    </Suspense>
  );
}
