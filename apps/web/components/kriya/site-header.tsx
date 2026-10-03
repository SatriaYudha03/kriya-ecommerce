"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import { Bell, ChevronDown, LogOut, Menu, Package, Search, ShoppingBag, User, X } from "lucide-react";
import type { Category } from "@/lib/types";
import { categoryImages, categoryLabel } from "@/lib/category-meta";
import { cn } from "@/lib/utils";
import { useAuth } from "./auth-provider";
import { useLanguage } from "./language-provider";
import { useCartStore } from "@/stores/cart-store";
import { useUnreadNotificationCount } from "@/lib/aftersales/queries";

// Ruangan yang ditampilkan langsung di nav desktop (sisanya di dropdown Katalog).
const PINNED_ROOMS = ["living-room", "workspace", "bedroom"];

const SCROLL_THRESHOLD = 24;

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

// Menutup dropdown hover/focus-within setelah item dipilih.
function blurActive() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

// Sembunyikan tombol × bawaan browser — diganti tombol bersihkan sendiri.
const SEARCH_INPUT =
  "min-w-0 flex-1 bg-transparent py-1.5 text-sm focus:outline-none [&::-webkit-search-cancel-button]:appearance-none";

// Dua nada: putih di atas foto hero (transparan) / gelap di atas latar putih (solid).
const TONES = {
  overlay: {
    link: "text-white/90 hover:text-white",
    linkActive: "text-white",
    icon: "rounded-full p-2 text-white hover:bg-white/10 hover:text-white",
    searchBox: "border-white bg-white/10",
    searchInput: "text-white placeholder:text-white/70",
    searchBtn: "shrink-0 rounded-sm p-2 text-white transition-colors hover:bg-white/10",
  },
  solid: {
    link: "text-neutral-700 hover:text-espresso",
    linkActive: "text-espresso",
    icon: "rounded-full p-2 text-espresso hover:bg-sand hover:text-espresso",
    searchBox: "border-espresso bg-white",
    searchInput: "text-neutral-900 placeholder:text-neutral-500",
    searchBtn: "shrink-0 rounded-sm p-2 text-espresso transition-colors hover:bg-sand",
  },
};

export function SiteHeader({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, loading: authLoading, signOut } = useAuth();
  const { t, locale } = useLanguage();
  const { data: unread = 0 } = useUnreadNotificationCount(Boolean(user));
  const itemCount = useCartStore((s) => s.items.reduce((n, i) => n + i.qty, 0));
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > SCROLL_THRESHOLD,
    () => false,
  );

  // Hanya di home header menimpa hero; begitu digulir / menu dibuka jadi solid.
  const transparent = pathname === "/" && !scrolled && !menuOpen;
  const tone = transparent ? TONES.overlay : TONES.solid;
  const iconBtn = tone.icon;
  const pinned = PINNED_ROOMS.map((slug) => categories.find((c) => c.slug === slug)).filter(
    (c): c is Category => c !== undefined,
  );

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
    setMenuOpen(false);
    setSearchOpen(false);
    inputRef.current?.blur();
  }

  const isActive = (slug: string) => pathname === `/categories/${slug}`;
  const catalogActive = pathname.startsWith("/categories/");

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,box-shadow,color] duration-300",
        transparent
          ? "bg-transparent text-white"
          : "border-b border-neutral-200 bg-white/95 text-espresso shadow-sm backdrop-blur",
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:gap-8 lg:px-10">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={t("nav.openMenu")}
          aria-expanded={menuOpen}
          className={cn(iconBtn, "-ml-2 lg:hidden")}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link
          href="/"
          // Mobile: logo mengalah saat kolom search terbuka agar kolomnya cukup lebar.
          className={cn("text-2xl font-light tracking-[0.3em]", searchOpen && "hidden md:block")}
        >
          KRIYA
        </Link>

        <nav className="hidden items-center gap-7 text-[15px] lg:flex">
          {/* Mega-menu Katalog: hover atau fokus keyboard. pt-3 menjembatani celah
              antara pemicu dan panel agar hover tidak putus. */}
          <div className="group relative">
            <Link
              href="/#collections"
              aria-haspopup="true"
              className={cn(
                "flex items-center gap-1 py-2",
                catalogActive ? tone.linkActive : tone.link,
              )}
            >
              {t("nav.catalog")}
              <ChevronDown className="h-4 w-4 transition-transform group-focus-within:rotate-180 group-hover:rotate-180" />
            </Link>
            <div className="invisible absolute top-full -left-4 pt-3 opacity-0 transition-all duration-200 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div className="w-[560px] rounded-lg bg-white p-4 text-neutral-900 shadow-xl ring-1 ring-black/5">
                <div className="grid grid-cols-3 gap-3">
                  {categories.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/categories/${c.slug}`}
                      onClick={blurActive}
                      className="group/item rounded-md p-1.5 hover:bg-sand"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden rounded bg-sand">
                        {categoryImages[c.slug] && (
                          <Image
                            src={categoryImages[c.slug]}
                            alt=""
                            fill
                            sizes="180px"
                            className="object-cover transition-transform duration-500 group-hover/item:scale-105"
                          />
                        )}
                      </div>
                      <p
                        className={cn(
                          "mt-2 px-0.5 text-sm",
                          isActive(c.slug) ? "font-semibold text-brand-strong" : "text-neutral-800",
                        )}
                      >
                        {categoryLabel(c.slug, c.name, locale)}
                      </p>
                    </Link>
                  ))}
                </div>
                <Link
                  href="/#collections"
                  onClick={blurActive}
                  className="mt-3 block border-t border-neutral-200 px-1.5 pt-3 text-sm font-medium text-brand-strong hover:underline"
                >
                  {t("nav.catalogAll")} →
                </Link>
              </div>
            </div>
          </div>

          {pinned.map((c) => (
            <Link
              key={c.slug}
              href={`/categories/${c.slug}`}
              className={cn(
                "relative py-2",
                isActive(c.slug) ? tone.linkActive : tone.link,
                isActive(c.slug) &&
                  "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand",
              )}
            >
              {categoryLabel(c.slug, c.name, locale)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-0.5 md:pl-8">
          {/* Hanya ikon; diklik → kolom melebar dari kanan ke kiri (semua ukuran layar). */}
          <form
            onSubmit={submitSearch}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setSearchOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchOpen(false);
                inputRef.current?.blur();
              }
            }}
            className={cn(
              // Lebar dianimasikan lewat max-width: ikon saja → mengisi ruang sampai menu terakhir.
              "flex min-w-0 flex-1 items-center justify-end rounded-sm border transition-[max-width,border-color,background-color] duration-300 ease-out",
              searchOpen ? cn("max-w-[40rem] pl-3", tone.searchBox) : "max-w-10 border-transparent",
            )}
          >
            <input
              ref={inputRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("nav.searchPlaceholder")}
              aria-label={t("nav.search")}
              tabIndex={searchOpen ? 0 : -1}
              className={cn(
                SEARCH_INPUT,
                tone.searchInput,
                "transition-opacity duration-300",
                searchOpen ? "opacity-100" : "opacity-0",
              )}
            />
            {searchOpen && q && (
              <button type="button" onClick={() => { setQ(""); inputRef.current?.focus(); }} aria-label={t("nav.clearSearch")} className={tone.searchBtn}>
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type={searchOpen ? "submit" : "button"}
              onClick={(e) => {
                if (searchOpen) return;
                e.preventDefault();
                setSearchOpen(true);
                inputRef.current?.focus();
              }}
              aria-label={t("nav.search")}
              aria-expanded={searchOpen}
              className={searchOpen ? tone.searchBtn : iconBtn}
            >
              <Search className={searchOpen ? "h-4 w-4" : "h-5 w-5"} />
            </button>
          </form>

          {!authLoading &&
            (user ? (
              <div className="group relative hidden md:block">
                <button
                  type="button"
                  aria-label={t("nav.account")}
                  aria-haspopup="true"
                  className={cn(iconBtn, "relative")}
                >
                  <User className="h-5 w-5" />
                  {unread > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand ring-2 ring-white" />
                  )}
                </button>
                <div className="invisible absolute top-full right-0 pt-2 opacity-0 transition-all duration-200 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  <div className="w-52 rounded-lg bg-white py-1.5 text-sm text-neutral-800 shadow-xl ring-1 ring-black/5">
                    <p className="truncate border-b border-neutral-100 px-4 pt-1.5 pb-2.5 text-xs text-neutral-500">
                      {user.email}
                    </p>
                    <Link href="/profile" onClick={blurActive} className="flex items-center gap-2.5 px-4 py-2 hover:bg-sand">
                      <User className="h-4 w-4" />
                      {t("nav.profile")}
                    </Link>
                    <Link href="/orders" onClick={blurActive} className="flex items-center gap-2.5 px-4 py-2 hover:bg-sand">
                      <Package className="h-4 w-4" />
                      {t("nav.orders")}
                    </Link>
                    <Link
                      href="/account/notifications"
                      onClick={blurActive}
                      className="flex items-center gap-2.5 px-4 py-2 hover:bg-sand"
                    >
                      <Bell className="h-4 w-4" />
                      {t("after.notifications.title")}
                      {unread > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        blurActive();
                        signOut();
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left hover:bg-sand"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("nav.logout")}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link href="/login" aria-label={t("nav.login")} className={cn(iconBtn, "hidden md:block")}>
                <User className="h-5 w-5" />
              </Link>
            ))}

          <Link href="/cart" aria-label={t("nav.cart")} className={cn(iconBtn, "relative")}>
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {menuOpen && (
        <div className="max-h-[calc(100svh-5rem)] overflow-y-auto border-t border-neutral-200 lg:hidden">
          <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6">
            <form onSubmit={submitSearch} className="md:hidden">
              <div className="flex items-center rounded-md border border-neutral-300 bg-white p-1 pl-4">
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("nav.searchMobilePlaceholder")}
                  aria-label={t("nav.search")}
                  className={cn(SEARCH_INPUT, TONES.solid.searchInput)}
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    aria-label={t("nav.clearSearch")}
                    className={TONES.solid.searchBtn}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button type="submit" aria-label={t("nav.search")} className={TONES.solid.searchBtn}>
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>
            <div>
              <p className="px-2 pb-1 text-xs font-medium tracking-widest text-neutral-400 uppercase">
                {t("nav.catalog")}
              </p>
              <div className="grid sm:grid-cols-2">
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/categories/${c.slug}`}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "rounded-lg px-2 py-2.5 text-sm text-neutral-700 hover:bg-sand",
                      isActive(c.slug) && "font-medium text-brand-strong",
                    )}
                  >
                    {categoryLabel(c.slug, c.name, locale)}
                  </Link>
                ))}
              </div>
            </div>
            {!authLoading && (
              <div className="space-y-1 border-t border-neutral-200 pt-3">
                {user ? (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-lg px-2 py-2.5 text-sm text-neutral-700 hover:bg-sand"
                    >
                      {t("nav.profile")}
                    </Link>
                    <Link
                      href="/orders"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-lg px-2 py-2.5 text-sm text-neutral-700 hover:bg-sand"
                    >
                      {t("nav.orders")}
                    </Link>
                    <Link
                      href="/account/notifications"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center rounded-lg px-2 py-2.5 text-sm text-neutral-700 hover:bg-sand"
                    >
                      {t("after.notifications.title")}
                      {unread > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        signOut();
                        setMenuOpen(false);
                      }}
                      className="w-full rounded-lg px-2 py-2.5 text-left text-sm text-neutral-700 hover:bg-sand"
                    >
                      {t("nav.logout")}
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-2 py-2.5 text-sm font-medium text-espresso hover:bg-sand"
                  >
                    {t("nav.login")}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
