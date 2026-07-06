"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import type { Category } from "@/lib/types";
import { categoryLabel } from "@/lib/category-meta";
import { cn } from "@/lib/utils";

// Header toko (gaya anon): logo, pencarian, ikon keranjang, baris nav kategori
// di desktop, dan menu geser di mobile. Kategori diterima dari layout (server
// fetch) agar nav siap tanpa waterfall di client.
export function SiteHeader({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/cari?q=${encodeURIComponent(query)}` : "/cari");
    setMenuOpen(false);
  }

  const isActive = (slug: string) => pathname === `/kategori/${slug}`;

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-cream/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Buka menu"
            aria-expanded={menuOpen}
            className="rounded-full p-2 text-neutral-700 hover:bg-neutral-200/60 md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="text-xl font-semibold tracking-tight text-neutral-900">
            KRIYA
          </Link>

          <form onSubmit={submitSearch} className="mx-auto hidden w-full max-w-md md:block">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari furniture, mis. meja kerja"
                aria-label="Cari furniture"
                className="w-full rounded-full border border-neutral-300 bg-white py-2 pr-4 pl-9 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/cari"
              aria-label="Cari"
              className="rounded-full p-2 text-neutral-700 hover:bg-neutral-200/60 md:hidden"
            >
              <Search className="h-5 w-5" />
            </Link>
            <Link
              href="/cart"
              aria-label="Keranjang"
              className="rounded-full p-2 text-neutral-700 hover:bg-neutral-200/60"
            >
              <ShoppingBag className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <nav className="hidden h-11 items-center gap-6 text-sm md:flex">
          <Link
            href="/"
            className={cn(
              "text-neutral-600 hover:text-neutral-900",
              pathname === "/" && "text-neutral-900",
            )}
          >
            Beranda
          </Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/kategori/${c.slug}`}
              className={cn(
                "text-neutral-600 hover:text-neutral-900",
                isActive(c.slug) && "font-medium text-brand-strong",
              )}
            >
              {categoryLabel(c.slug, c.name)}
            </Link>
          ))}
        </nav>
      </div>

      {menuOpen && (
        <div className="border-t border-neutral-200 bg-cream md:hidden">
          <div className="mx-auto max-w-6xl space-y-4 px-4 py-4">
            <form onSubmit={submitSearch}>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari furniture…"
                  aria-label="Cari furniture"
                  className="w-full rounded-full border border-neutral-300 bg-white py-2 pr-4 pl-9 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
                />
              </div>
            </form>
            <div className="grid">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/kategori/${c.slug}`}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "rounded-lg px-2 py-2.5 text-sm text-neutral-700 hover:bg-neutral-200/50",
                    isActive(c.slug) && "font-medium text-brand-strong",
                  )}
                >
                  {categoryLabel(c.slug, c.name)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
