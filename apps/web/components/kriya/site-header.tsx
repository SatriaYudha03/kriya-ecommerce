"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import type { Category } from "@/lib/types";
import { categoryLabel } from "@/lib/category-meta";
import { cn } from "@/lib/utils";
import { useAuth } from "./auth-provider";
import { useLanguage } from "./language-provider";
import { useCartStore } from "@/stores/cart-store";

export function SiteHeader({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");
  const { user, loading: authLoading, signOut } = useAuth();
  const { t, locale, setLocale } = useLanguage();
  const itemCount = useCartStore((s) => s.items.reduce((n, i) => n + i.qty, 0));

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
    setMenuOpen(false);
  }

  const isActive = (slug: string) => pathname === `/categories/${slug}`;

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
                placeholder={t("nav.searchPlaceholder")}
                aria-label={t("nav.search")}
                className="w-full rounded-full border border-neutral-300 bg-white py-2 pr-4 pl-9 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/search"
              aria-label="Cari"
              className="rounded-full p-2 text-neutral-700 hover:bg-neutral-200/60 md:hidden"
            >
              <Search className="h-5 w-5" />
            </Link>

            {!authLoading && (
              <>
                {user ? (
                  <div className="flex items-center gap-1">
                    <Link
                      href="/profile"
                      className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-200/60 md:flex"
                    >
                      <User className="h-4 w-4" />
                      <span className="max-w-[120px] truncate">{user.email?.split("@")[0]}</span>
                    </Link>
                    <Link
                      href="/orders"
                      className="hidden rounded-full px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-200/60 md:block"
                    >
                      {t("nav.orders")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => signOut()}
                      aria-label={t("nav.logout")}
                      className="rounded-full p-2 text-neutral-700 hover:bg-neutral-200/60"
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="hidden rounded-full px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200/60 md:block"
                  >
                    {t("nav.login")}
                  </Link>
                )}
              </>
            )}

            <div className="ml-2 flex items-center border-l border-neutral-300 pl-3">
              <button
                type="button"
                onClick={() => setLocale(locale === "en" ? "id" : "en")}
                className="rounded text-xs font-semibold text-neutral-600 hover:text-neutral-900"
              >
                {locale.toUpperCase()}
              </button>
            </div>

            <Link
              href="/cart"
              aria-label={t("nav.cart")}
              className="relative ml-2 rounded-full p-2 text-neutral-700 hover:bg-neutral-200/60"
            >
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
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
            {t("nav.home")}
          </Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
                  href={`/categories/${c.slug}`}
              className={cn(
                "text-neutral-600 hover:text-neutral-900",
                isActive(c.slug) && "font-medium text-brand-strong",
              )}
            >
              {categoryLabel(c.slug, c.name, locale)}
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
                  placeholder={t("nav.searchMobilePlaceholder")}
                  aria-label={t("nav.search")}
                  className="w-full rounded-full border border-neutral-300 bg-white py-2 pr-4 pl-9 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
                />
              </div>
            </form>
            <div className="grid">
              {categories.map((c) => (
                <Link
                  key={c.slug}
              href={`/categories/${c.slug}`}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "rounded-lg px-2 py-2.5 text-sm text-neutral-700 hover:bg-neutral-200/50",
                    isActive(c.slug) && "font-medium text-brand-strong",
                  )}
                >
                  {categoryLabel(c.slug, c.name, locale)}
                </Link>
              ))}
            </div>
            {!authLoading && !user && (
              <div className="border-t border-neutral-200 pt-3">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-2 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200/50"
                >
                  {t("nav.login")}
                </Link>
              </div>
            )}
            {!authLoading && user && (
              <div className="border-t border-neutral-200 pt-3 space-y-1">
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-2 py-2.5 text-sm text-neutral-700 hover:bg-neutral-200/50"
                >
                  {t("nav.profile")}
                </Link>
                <Link
                  href="/orders"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-2 py-2.5 text-sm text-neutral-700 hover:bg-neutral-200/50"
                >
                  {t("nav.orders")}
                </Link>
                <button
                  type="button"
                  onClick={() => { signOut(); setMenuOpen(false); }}
                  className="w-full rounded-lg px-2 py-2.5 text-left text-sm text-neutral-700 hover:bg-neutral-200/50"
                >
                  {t("nav.logout")}
                </button>
              </div>
            )}
            <div className="border-t border-neutral-200 pt-3">
              <button
                type="button"
                onClick={() => {
                  setLocale(locale === "en" ? "id" : "en");
                  setMenuOpen(false);
                }}
                className="w-full rounded-lg px-2 py-2.5 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-200/50"
              >
                {t("nav.switchLang")}: {locale === "en" ? "Indonesia" : "English"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
