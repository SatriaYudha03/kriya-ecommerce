import type { Metadata } from "next";
import { productDetails } from "@/lib/fixtures";
import { ProductDetailView } from "@/components/kriya/product-detail-view";

// Next 16: params adalah Promise.
type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = productDetails[slug];
  return {
    title: product ? `${product.name} — KRIYA` : "Produk — KRIYA",
    description: product?.description,
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  return <ProductDetailView slug={slug} />;
}
