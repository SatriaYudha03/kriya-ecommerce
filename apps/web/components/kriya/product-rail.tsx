"use client";

import type { ProductsQuery } from "@/lib/api";
import { useProducts } from "@/lib/queries";
import type { ListEnvelope } from "@/lib/http";
import type { ProductListItem, ServerInitial } from "@/lib/catalog/types";
import { ProductGrid, ProductGridSkeleton } from "./product-grid";
import { SectionHeading } from "./section-heading";
import { useLanguage } from "./language-provider";

// Seksi baris produk untuk home: memuat via TanStack Query dengan skeleton.
export function ProductRail({
  title,
  subtitle,
  href,
  params,
  initial,
  skeletonCount = 4,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  params: ProductsQuery;
  // Data awal dari Server Component (lihat app/(store)/page.tsx).
  initial?: ServerInitial<ListEnvelope<ProductListItem>>;
  skeletonCount?: number;
}) {
  const { data, isLoading, isError } = useProducts(params, initial);
  const products = data?.data ?? [];
  const { t } = useLanguage();

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <SectionHeading title={title} subtitle={subtitle} href={href} />
      <div className="mt-6">
        {isLoading ? (
          <ProductGridSkeleton count={skeletonCount} />
        ) : isError ? (
          <p className="text-sm text-neutral-500">{t("product.loadError")}</p>
        ) : products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <p className="text-sm text-neutral-500">{t("product.empty")}</p>
        )}
      </div>
    </section>
  );
}
