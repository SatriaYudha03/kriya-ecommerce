import { SiteHeader } from "@/components/kriya/site-header";
import { SiteFooter } from "@/components/kriya/site-footer";

// Layout grup toko: header + konten + footer.
export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
