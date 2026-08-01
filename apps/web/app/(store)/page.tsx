import { getCategories } from "@/lib/api";
import { Hero } from "@/components/kriya/hero";
import { ServiceFeatures } from "@/components/kriya/service-features";
import { CategoryShowcase } from "@/components/kriya/category-showcase";
import { ClientProductRails } from "./client-product-rails";

// Home M1 (fixtures +' live): hero, fitur layanan, grid ruangan, baris produk,
// banner penawaran. Struktur mengikuti anon-ecommerce, palet hangat KRIYA.
export default async function HomePage() {
  const categories = await getCategories();

  return (
    <div className="pb-8">
      <Hero />
      <ServiceFeatures />
      <CategoryShowcase categories={categories} />
      <ClientProductRails />
    </div>
  );
}
