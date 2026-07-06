import Link from "next/link";
import { Search, ShoppingBag } from "lucide-react";
import { categories } from "@/lib/fixtures";

// Header toko: logo KRIYA, nav kategori, placeholder pencarian, ikon keranjang.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-[#faf7f2]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight text-neutral-900"
        >
          KRIYA
        </Link>
        <nav className="hidden gap-5 text-sm text-neutral-600 md:flex">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/kategori/${c.slug}`}
              className="hover:text-neutral-900"
            >
              {c.name}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/cari"
            className="flex items-center gap-2 rounded-full border border-neutral-300 px-3 py-1.5 text-sm text-neutral-500 hover:border-neutral-400"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Cari furniture…</span>
          </Link>
          <Link
            href="/cart"
            aria-label="Keranjang"
            className="rounded-full p-2 hover:bg-neutral-200/60"
          >
            <ShoppingBag className="h-5 w-5 text-neutral-800" />
          </Link>
        </div>
      </div>
    </header>
  );
}
