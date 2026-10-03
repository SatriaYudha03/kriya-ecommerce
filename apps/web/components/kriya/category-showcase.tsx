"use client";

import type { Category } from "@/lib/types";
import { CategoryCard } from "./category-card";
import { SectionHeading } from "./section-heading";
import { useLanguage } from "./language-provider";

export function CategoryShowcase({ categories }: { categories: Category[] }) {
  const { t } = useLanguage();
  return (
    <section id="collections" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-8">
      <SectionHeading
        title={t("home.showcase.title")}
        subtitle={t("home.showcase.subtitle")}
      />
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((c) => (
          <CategoryCard key={c.slug} category={c} />
        ))}
      </div>
    </section>
  );
}
