import type { ProductListItem } from "@/lib/types";
import { ProductCard } from "./product-card";

const cols =
  "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4";

// Grid produk presentasional (2 kolom mobile → 4 desktop, AGENT-FE).
export function ProductGrid({ products }: { products: ProductListItem[] }) {
  return (
    <div className={cols}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

// Skeleton loading grid — jumlah kartu menyesuaikan estimasi halaman.
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={cols} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[4/5] rounded-2xl bg-neutral-100" />
          <div className="mt-3 h-4 w-2/3 rounded bg-neutral-100" />
          <div className="mt-2 h-4 w-1/3 rounded bg-neutral-100" />
        </div>
      ))}
    </div>
  );
}
