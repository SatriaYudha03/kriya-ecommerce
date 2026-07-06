import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Category } from "@/lib/types";
import { categoryGradients, categoryLabel } from "@/lib/category-meta";

export function CategoryCard({ category }: { category: Category }) {
  const label = categoryLabel(category.slug, category.name);
  const gradient = categoryGradients[category.slug] ?? "from-sand to-cream";
  return (
    <Link
      href={`/kategori/${category.slug}`}
      className={`group relative flex aspect-square flex-col justify-between overflow-hidden rounded-2xl bg-linear-to-br ${gradient} p-5 ring-1 ring-black/5 transition-shadow hover:shadow-md`}
    >
      <span className="text-xs font-medium uppercase tracking-widest text-clay/70">
        Ruangan
      </span>
      <span className="flex items-center justify-between">
        <span className="text-base font-medium text-neutral-900">{label}</span>
        <ArrowRight className="h-4 w-4 text-clay transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
