import type { Category } from "@/lib/types";
import { CategoryCard } from "./category-card";
import { SectionHeading } from "./section-heading";

export function CategoryShowcase({ categories }: { categories: Category[] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <SectionHeading
        title="Belanja per ruangan"
        subtitle="Enam ruangan, satu gaya minimal hangat."
      />
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((c) => (
          <CategoryCard key={c.slug} category={c} />
        ))}
      </div>
    </section>
  );
}
