"use client";

import Link from "next/link";
import type { ProductListItem } from "@/lib/types";
import { ProductMedia } from "./product-media";
import { useLanguage } from "./language-provider";
import { PriceTag } from "./catalog/price-tag";
import { RatingStars } from "./catalog/rating-stars";
import { WishlistButton } from "@/components/kriya/customer/wishlist-button";

// Kartu produk katalog. Rasio media 4:5 (AGENT-FE). Presentasional ?" dipakai
// baik di server maupun client component.
export function ProductCard({ product }: { product: ProductListItem }) {
  const { t } = useLanguage();
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-sand">
        {product.on_sale && (
          <div className="absolute left-2 top-2 z-10 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
            SALE
          </div>
        )}
        <div className="absolute right-2 top-2 z-10">
          <WishlistButton productId={product.id} variant="icon" />
        </div>
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
        {(product.rating_count ?? 0) > 0 && (
          <div className="mt-1">
            <RatingStars value={product.rating_avg ?? 0} count={product.rating_count ?? 0} size="sm" />
          </div>
        )}
        <div className="mt-1">
          <span className="text-xs text-neutral-500">{t("product.startsFrom")}</span>
          <div className="-mt-0.5">
            <PriceTag price={product.price_min} regularPrice={product.regular_price_min} size="sm" />
          </div>
        </div>
      </div>
    </Link>
  );
}
