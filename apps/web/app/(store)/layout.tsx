import { getCategoriesServer, getServerLocale } from "@/lib/catalog/server";
import { SiteHeader } from "@/components/kriya/site-header";
import { SiteFooter } from "@/components/kriya/site-footer";
import { TopBar } from "@/components/kriya/top-bar";

// Layout grup toko: top bar + header + konten + footer.
// Kategori diambil sekali di server (sesuai locale cookie, ter-cache — lihat
// lib/catalog/server.ts) dan dialirkan ke header & footer.
export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await getCategoriesServer(await getServerLocale());
  return (
    <>
      <TopBar />
      <SiteHeader categories={categories} />
      <main className="flex-1">{children}</main>
      <SiteFooter categories={categories} />
    </>
  );
}
