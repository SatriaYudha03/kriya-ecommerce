"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Minus, Package, Plus, Ruler, ShoppingBag, Truck } from "lucide-react";
import { categoryLabel } from "@/lib/category-meta";
import { formatRupiah } from "@/lib/format";
import { useProduct } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "./breadcrumbs";
import { EmptyState } from "./empty-state";
import { ProductGallery } from "./product-gallery";
import { ProductTabs } from "./product-tabs";
import { VariantSelector } from "./variant-selector";

export function ProductDetailView({ slug }: { slug: string }) {
  const { data: product, isLoading, isError } = useProduct(slug);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const selected = useMemo(() => {
    if (!product) return null;
    return product.variants.find((v) => v.id === selectedId) ?? product.variants[0];
  }, [product, selectedId]);

  // Ganti varian: pilih + reset kuantitas & notifikasi.
  const handleSelect = (id: string) => {
    setSelectedId(id);
    setQty(1);
    setAdded(false);
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
          { label: categoryLabel(product.category.slug, product.category.name), href: `/kategori/${product.category.slug}` },
          { label: product.name },
        ]}
      />

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />

        <div>
          <Link
            href={`/kategori/${product.category.slug}`}
            className="text-sm font-medium text-brand-strong hover:underline"
          >
            {categoryLabel(product.category.slug, product.category.name)}
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
            {product.name}
          </h1>

          <div className="mt-4 flex items-center gap-3">
            <p className="text-2xl font-semibold text-neutral-900">
              {formatRupiah(selected.price)}
            </p>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                stock > 0 ? "bg-brand-tint text-brand-strong" : "bg-neutral-100 text-neutral-500",
              )}
            >
              {stockLabel}
            </span>
          </div>

          <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-600">
            {product.description}
          </p>

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
              onClick={() => setAdded(true)}
              disabled={stock <= 0}
              className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingBag className="h-4 w-4" />
              {stock > 0 ? "Tambah ke keranjang" : "Stok habis"}
            </button>
          </div>

          {added && (
            <p className="mt-3 text-sm text-neutral-500">
              Keranjang aktif pada M2 — untuk sekarang aksi ini masih demo.
            </p>
          )}

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
