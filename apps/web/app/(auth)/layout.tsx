import { getCategoriesServer, getServerLocale } from "@/lib/catalog/server";
import { SiteHeader } from "@/components/kriya/site-header";
import { SiteFooter } from "@/components/kriya/site-footer";
import { TopBar } from "@/components/kriya/top-bar";

// Layout auth memakai shell toko (top bar + header + footer) agar navigasi
// tetap tersedia. Kartu terbelah form/foto ada di <AuthCard> per halaman.
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await getCategoriesServer(await getServerLocale());
  return (
    <>
      <TopBar />
      <SiteHeader categories={categories} />
      {/* Latar beige membungkus footer juga agar margin atas footer (mt-16)
          tidak tampil sebagai strip putih. */}
      <div className="flex flex-1 flex-col bg-[#f1eee8]">
        <main className="flex-1 px-4 pt-8 md:pt-12">{children}</main>
        <SiteFooter categories={categories} />
      </div>
    </>
  );
}
