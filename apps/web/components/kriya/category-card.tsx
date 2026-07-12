import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Category } from "@/lib/types";
import { categoryGradients, categoryImages, categoryLabel } from "@/lib/category-meta";
import { useLanguage } from "./language-provider";

export function CategoryCard({ category }: { category: Category }) {
  const { t, locale } = useLanguage();
  const label = categoryLabel(category.slug, category.name, locale);
  const gradient = categoryGradients[category.slug] ?? "from-sand to-cream";
  const image = categoryImages[category.slug];
  return (
    <Link
      href={`/categories/${category.slug}`}
      className={`group relative flex aspect-square flex-col justify-between overflow-hidden rounded-2xl bg-linear-to-br ${gradient} p-5 ring-1 ring-black/5 transition-shadow hover:shadow-md`}
    >
      {image && (
        <Image
          src={image}
          alt={label}
          fill
          sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
      <span className="absolute inset-0 bg-black/40" />
      <span className="relative z-10 text-xs font-medium uppercase tracking-widest text-white/70">
        {t("category.room" as any)}
      </span>
      <span className="relative z-10 flex items-center justify-between">
        <span className="text-base font-medium text-white">{label}</span>
        <ArrowRight className="h-4 w-4 text-white transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
