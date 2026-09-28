import type { Metadata } from "next";
import { getProductServer, getServerLocale } from "@/lib/catalog/server";
import type { ProductDetail } from "@/lib/catalog/types";
import { productDetails } from "@/lib/fixtures";
import { ProductDetailView } from "@/components/kriya/product-detail-view";

// Next 16: params adalah Promise.
type Params = { params: Promise<{ slug: string }> };

// Produk diambil SEKALI di server: getProductServer di-dedupe React cache()
// antara generateMetadata dan page, lalu diteruskan ke client sebagai data awal
// TanStack Query sehingga ProductDetailView tidak mengambil ulang saat mount.
async function loadProduct(slug: string): Promise<ProductDetail | undefined> {
  try {
    return await getProductServer(slug, await getServerLocale());
  } catch {
    // 404 / API mati: biarkan client yang menampilkan state error-nya.
    return undefined;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = (await loadProduct(slug)) ?? productDetails[slug];
  return {
    title: product ? `${product.name} — KRIYA` : "Produk — KRIYA",
    description: product?.description,
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const [product, locale] = await Promise.all([loadProduct(slug), getServerLocale()]);
  return (
    <ProductDetailView
      slug={slug}
      initialProduct={product ? { locale, data: product } : undefined}
    />
  );
}
