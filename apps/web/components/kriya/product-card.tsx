import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import type { ProductListItem } from "@/lib/types";
import { ProductMedia } from "./product-media";

// Kartu produk katalog. Rasio media 4:5 (AGENT-FE). Presentasional — dipakai
// baik di server maupun client component.
export function ProductCard({ product }: { product: ProductListItem }) {
  return (
    <Link href={`/produk/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-sand">
        <ProductMedia
          name={product.name}
          src={product.thumbnail_url}
          className="transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="mt-3">
        <h3 className="text-sm font-medium text-neutral-900 group-hover:text-brand-strong">
          {product.name}
        </h3>
        <p className="mt-0.5 text-sm text-neutral-500">
          Mulai {formatRupiah(product.price_min)}
        </p>
      </div>
    </Link>
  );
}
