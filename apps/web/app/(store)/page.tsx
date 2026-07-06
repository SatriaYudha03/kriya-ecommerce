import { getCategories } from "@/lib/api";
import { Hero } from "@/components/kriya/hero";
import { ServiceFeatures } from "@/components/kriya/service-features";
import { CategoryShowcase } from "@/components/kriya/category-showcase";
import { ProductRail } from "@/components/kriya/product-rail";
import { PromoBanner } from "@/components/kriya/promo-banner";

// Home M1 (fixtures → live): hero, fitur layanan, grid ruangan, baris produk,
// banner penawaran. Struktur mengikuti anon-ecommerce, palet hangat KRIYA.
export default async function HomePage() {
  const categories = await getCategories();

  return (
    <div className="pb-8">
      <Hero />
      <ServiceFeatures />
      <CategoryShowcase categories={categories} />
      <ProductRail
        title="Produk terbaru"
        subtitle="Baru masuk ke katalog."
        params={{ sort: "newest", limit: 8 }}
        skeletonCount={8}
      />
      <PromoBanner />
      <ProductRail
        title="Untuk ruang kerja"
        subtitle="Meja, kursi, dan penyimpanan."
        href="/kategori/workspace"
        params={{ category: "workspace", limit: 4 }}
      />
      <ProductRail
        title="Bikin betah di ruang keluarga"
        subtitle="Sofa, meja kopi, dan teman santai."
        href="/kategori/living-room"
        params={{ category: "living-room", limit: 4 }}
      />
    </div>
  );
}
