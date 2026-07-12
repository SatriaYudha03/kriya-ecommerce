import { Suspense } from "react";
import type { Metadata } from "next";
import { categoryLabels } from "@/lib/category-meta";
import { CategoryView } from "@/components/kriya/category-view";
import { ProductGridSkeleton } from "@/components/kriya/product-grid";

// Next 16: params adalah Promise (async request APIs).
type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const name = categoryLabels.id[slug] ?? slug;
  return {
    title: `${name} — KRIYA`,
    description: `Katalog ${name.toLowerCase()} furniture flat-pack KRIYA.`,
  };
}

export default async function CategoryPage({ params }: Params) {
  const { slug } = await params;
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-8">
          <ProductGridSkeleton count={6} />
        </div>
      }
    >
      <CategoryView slug={slug} />
    </Suspense>
  );
}
