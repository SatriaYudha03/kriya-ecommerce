"use client";

import type { ProductsQuery } from "@/lib/api";
import { useProducts } from "@/lib/queries";
import { ProductGrid, ProductGridSkeleton } from "./product-grid";
import { SectionHeading } from "./section-heading";

// Seksi baris produk untuk home: memuat via TanStack Query dengan skeleton.
export function ProductRail({
  title,
  subtitle,
  href,
  params,
  skeletonCount = 4,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  params: ProductsQuery;
  skeletonCount?: number;
}) {
  const { data, isLoading, isError } = useProducts(params);
  const products = data?.data ?? [];

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <SectionHeading title={title} subtitle={subtitle} href={href} />
      <div className="mt-6">
        {isLoading ? (
          <ProductGridSkeleton count={skeletonCount} />
        ) : isError ? (
          <p className="text-sm text-neutral-500">Gagal memuat produk. Coba muat ulang halaman.</p>
        ) : products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <p className="text-sm text-neutral-500">Belum ada produk di seksi ini.</p>
        )}
      </div>
    </section>
  );
}
