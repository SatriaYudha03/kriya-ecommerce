"use client";

import { useState } from "react";
import type { ProductImage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProductMedia } from "./product-media";

// Galeri PDP: media utama + thumbnail. Seed berbeda per gambar agar placeholder
// monogram tampak bervariasi selama foto asli belum ada.
export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-sand">
        <ProductMedia
          name={name}
          src={current?.url}
          seed={`${name}-${active}`}
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
        />
      </div>

      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-3">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Lihat ${img.alt}`}
              aria-current={i === active}
              className={cn(
                "relative aspect-square overflow-hidden rounded-xl bg-sand ring-1 transition",
                i === active ? "ring-2 ring-neutral-900" : "ring-black/5 hover:ring-neutral-300",
              )}
            >
              <ProductMedia name={name} src={img.url} seed={`${name}-${i}`} sizes="120px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
