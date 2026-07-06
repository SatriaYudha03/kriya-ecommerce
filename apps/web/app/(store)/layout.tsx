import { getCategories } from "@/lib/api";
import { SiteHeader } from "@/components/kriya/site-header";
import { SiteFooter } from "@/components/kriya/site-footer";
import { TopBar } from "@/components/kriya/top-bar";

// Layout grup toko: top bar + header + konten + footer.
// Kategori diambil sekali di server dan dialirkan ke header & footer.
export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await getCategories();
  return (
    <>
      <TopBar />
      <SiteHeader categories={categories} />
      <main className="flex-1">{children}</main>
      <SiteFooter categories={categories} />
    </>
  );
}
