"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Minus, Package, Plus, Ruler, ShoppingBag, Truck } from "lucide-react";
import { categoryLabel } from "@/lib/category-meta";
import { useProduct, useSimilarProducts } from "@/lib/catalog/queries";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import { toast } from "sonner";
import { Breadcrumbs } from "./breadcrumbs";
import { EmptyState } from "./empty-state";
import { ProductGallery } from "./product-gallery";
import { ProductTabs } from "./product-tabs";
import { VariantSelector } from "./variant-selector";
import { ProductCard } from "./product-card";
import { PriceTag } from "./catalog/price-tag";
import { useLanguage } from "./language-provider";

function SimilarProducts({ productId }: { productId: string }) {
  const { data, isLoading } = useSimilarProducts(productId);

  if (isLoading || !data || data.data.length === 0) return null;

  return (
    <section className="mt-20 border-t border-neutral-200 pt-16">
      <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">Mungkin Kamu Suka</h2>
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-8">
        {data.data.slice(0, 4).map((item) => (
          <ProductCard
            key={item.slug}
            product={{
              id: item.product_id,
              slug: item.slug,
              name: item.name,
              category_slug: "", // Not strictly used for display
              thumbnail_url: item.thumbnail_url,
              price_min: item.price_min,
            }}
          />
        ))}
      </div>
    </section>
  );
}

export function ProductDetailView({ slug }: { slug: string }) {
  const { locale } = useLanguage();
  const { data: product, isLoading, isError } = useProduct(slug);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const addItem = useCartStore(state => state.addItem);
  const loading = useCartStore(state => state.loading);

  const selected = useMemo(() => {
    if (!product) return null;
    return product.variants.find((v) => v.id === selectedId) ?? product.variants[0];
  }, [product, selectedId]);

  // Ganti varian: pilih + reset kuantitas & notifikasi.
  const handleSelect = (id: string) => {
    setSelectedId(id);
    setQty(1);
  };

  const handleAdd = async () => {
    if (!product || !selected) return;
    try {
      await addItem({
        variant_id: selected.id,
        qty,
        price: selected.price,
        product: {
          slug: product.slug,
          name: product.name,
          thumbnail_url: product.images[0]?.url || "",
          color: selected.color,
          size: selected.size,
        },
      });
      toast.success("Berhasil ditambahkan ke keranjang");
    } catch {
      toast.error("Gagal menambahkan ke keranjang");
    }
  };

  if (isLoading) return <PdpSkeleton />;

  if (isError || !product || !selected) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <EmptyState
          title="Produk tidak ditemukan"
          hint="Produk yang kamu cari mungkin sudah tidak tersedia."
          action={
            <Link
              href="/"
              className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Kembali ke beranda
            </Link>
          }
        />
      </div>
    );
  }

  const stock = selected.stock;
  const stockLabel =
    stock > 0 ? (stock <= 5 ? `Sisa ${stock} unit` : "Stok tersedia") : "Stok habis";
  const d = product.dimensions;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "Beranda", href: "/" },
          { label: categoryLabel(product.category.slug, product.category.name, locale), href: `/categories/${product.category.slug}` },
          { label: product.name },
        ]}
      />

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />

        <div>
          <Link
            href={`/categories/${product.category.slug}`}
            className="text-sm font-medium text-brand-strong hover:underline"
          >
            {categoryLabel(product.category.slug, product.category.name, locale)}
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
            {product.name}
          </h1>

          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <PriceTag price={selected.price} regularPrice={selected.regular_price} size="lg" />
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  stock > 0 ? "bg-brand-tint text-brand-strong" : "bg-neutral-100 text-neutral-500",
                )}
              >
                {stockLabel}
              </span>
            </div>
            {selected.sale_ends_at && (
              <p className="text-xs text-red-600 font-medium">
                Promo berakhir {new Date(selected.sale_ends_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>

          {product.short_description && (
            <p className="mt-2 text-sm text-neutral-500 font-medium">
              {product.short_description}
            </p>
          )}

          <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-600">
            {product.description}
          </p>

          {(product.tags?.length ?? 0) > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {product.tags!.map((t) => (
                <span key={t.slug} className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600">
                  {t.name}
                </span>
              ))}
            </div>
          )}

          {(product.attributes?.length ?? 0) > 0 && (
            <div className="mt-4 text-sm text-neutral-600 flex flex-col gap-1">
              {product.attributes!.map((attr) => (
                <div key={attr.slug}>
                  <span className="font-semibold">{attr.name}:</span>{" "}
                  {attr.terms.map((t) => t.name).join(", ")}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6">
            <VariantSelector
              variants={product.variants}
              selectedId={selected.id}
              onSelect={handleSelect}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center rounded-full border border-neutral-300">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label="Kurangi jumlah"
                className="p-2.5 text-neutral-600 disabled:opacity-40"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-8 text-center text-sm tabular-nums">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(stock, q + 1))}
                disabled={qty >= stock || stock <= 0}
                aria-label="Tambah jumlah"
                className="p-2.5 text-neutral-600 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={stock <= 0 || loading}
              className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingBag className="h-4 w-4" />
              {stock > 0 ? (loading ? "Memproses..." : "Tambah ke keranjang") : "Stok habis"}
            </button>
          </div>

          <ul className="mt-8 space-y-2.5 border-t border-neutral-200 pt-6 text-sm text-neutral-600">
            <li className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-neutral-400" />
              {d.width_cm} × {d.depth_cm} × {d.height_cm} cm
            </li>
            <li className="flex items-center gap-2">
              <Package className="h-4 w-4 text-neutral-400" />
              Berat {product.weight_kg} kg{" "}
              {product.has_assembly_guide ? "· perlu perakitan" : "· tanpa perakitan"}
            </li>
            <li className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-neutral-400" />
              Pengiriman ke seluruh Indonesia
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-14">
        <ProductTabs product={product} />
      </div>

      <SimilarProducts productId={product.id} />
    </div>
  );
}

function PdpSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="h-4 w-48 animate-pulse rounded bg-neutral-100" />
      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-3xl bg-neutral-100" />
        <div className="space-y-4">
          <div className="h-4 w-24 animate-pulse rounded bg-neutral-100" />
          <div className="h-8 w-2/3 animate-pulse rounded bg-neutral-100" />
          <div className="h-7 w-40 animate-pulse rounded bg-neutral-100" />
          <div className="h-20 w-full animate-pulse rounded bg-neutral-100" />
          <div className="h-10 w-1/2 animate-pulse rounded-full bg-neutral-100" />
          <div className="h-12 w-full animate-pulse rounded-full bg-neutral-100" />
        </div>
      </div>
    </div>
  );
}
