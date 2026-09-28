import { getCategoriesServer, getProductsServer, getServerLocale } from "@/lib/catalog/server";
import type { ListEnvelope } from "@/lib/http";
import type { ProductListItem, ServerInitial } from "@/lib/catalog/types";
import { Hero } from "@/components/kriya/hero";
import { ServiceFeatures } from "@/components/kriya/service-features";
import { CategoryShowcase } from "@/components/kriya/category-showcase";
import { ClientProductRails } from "./client-product-rails";
import { HOME_RAILS, type HomeRailKey } from "./home-rails";

type RailInitial = ServerInitial<ListEnvelope<ProductListItem>> | undefined;

// Home M1 (fixtures +' live): hero, fitur layanan, grid ruangan, baris produk,
// banner penawaran. Struktur mengikuti anon-ecommerce, palet hangat KRIYA.
// Kategori + 3 baris produk diambil paralel di server (ter-cache), sehingga
// HTML pertama sudah berisi produk — tanpa waterfall JS → hydrate → 3 fetch.
export default async function HomePage() {
  const locale = await getServerLocale();
  const loadRail = async (key: HomeRailKey): Promise<RailInitial> => {
    try {
      return { locale, data: await getProductsServer(HOME_RAILS[key], locale) };
    } catch {
      return undefined; // gagal di server → ProductRail fetch sendiri di client
    }
  };

  const [categories, newest, workspace, livingRoom] = await Promise.all([
    getCategoriesServer(locale),
    loadRail("newest"),
    loadRail("workspace"),
    loadRail("livingRoom"),
  ]);

  return (
    <div className="pb-8">
      <Hero />
      <ServiceFeatures />
      <CategoryShowcase categories={categories} />
      <ClientProductRails initial={{ newest, workspace, livingRoom }} />
    </div>
  );
}
