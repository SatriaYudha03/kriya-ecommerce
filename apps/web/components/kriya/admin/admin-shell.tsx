"use client";

// Kerangka panel admin ala Shopify: top bar gelap, sidebar abu-abu dengan
// sub-menu yang terbuka sesuai modul aktif, area konten abu-abu terang.

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ExternalLink,
  House,
  Image as ImageIcon,
  Inbox,
  LogOut,
  Menu,
  Settings,
  Store,
  Tag,
  TicketPercent,
  User,
  X,
} from "lucide-react";
import { useAuth } from "@/components/kriya/auth-provider";
import { useLanguage } from "@/components/kriya/language-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminStats } from "@/lib/admin-queries";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type IconType = React.ComponentType<{ className?: string }>;

interface NavChild {
  href: string;
  key: MessageKey;
  count?: number;
}

interface NavItem {
  href: string;
  key: MessageKey;
  icon: IconType;
  exact?: boolean;
  count?: number;
  children?: NavChild[];
}

function matches(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

function NavCount({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span className="ml-auto min-w-5 rounded-md bg-[#e3e3e3] px-1.5 text-center text-xs font-medium leading-5 text-admin-muted tabular-nums">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function NavSection({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate: () => void }) {
  const { t } = useLanguage();
  const selfActive = matches(pathname, item.href, item.exact);
  const childActive = item.children?.some((c) => matches(pathname, c.href)) ?? false;
  const open = selfActive || childActive;
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={selfActive ? "page" : undefined}
        className={cn(
          "flex h-8 items-center gap-2 rounded-lg px-2 text-[13px] font-semibold transition-colors",
          selfActive
            ? "bg-white text-admin-text shadow-[0_1px_0_0_rgba(0,0,0,0.05)]"
            : "text-[#303030] hover:bg-black/[0.05]",
        )}
      >
        <Icon className={cn("size-[18px] shrink-0", open ? "text-admin-text" : "text-[#4a4a4a]")} />
        <span className="truncate">{t(item.key)}</span>
        <NavCount count={item.count} />
      </Link>
      {open && item.children && item.children.length > 0 && (
        <ul className="mt-0.5 space-y-0.5">
          {item.children.map((c) => {
            const active = matches(pathname, c.href);
            return (
              <li key={c.href}>
                <Link
                  href={c.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-8 items-center gap-2 rounded-lg pl-9 pr-2 text-[13px] transition-colors",
                    active
                      ? "bg-white font-semibold text-admin-text shadow-[0_1px_0_0_rgba(0,0,0,0.05)]"
                      : "font-medium text-admin-muted hover:bg-black/[0.05] hover:text-admin-text",
                  )}
                >
                  <span className="truncate">{t(c.key)}</span>
                  <NavCount count={c.count} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function initialsOf(email: string | undefined) {
  if (!email) return "A";
  return email.slice(0, 2).toUpperCase();
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { t, locale, setLocale } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const stats = useAdminStats();
  const s = stats.data;

  const main: NavItem[] = [
    { href: "/admin", key: "admin.nav.home", icon: House, exact: true },
    {
      href: "/admin/orders",
      key: "nav.admin.orders",
      icon: Inbox,
      count: s?.to_ship_count,
      children: [
        { href: "/admin/returns", key: "nav.admin.returns", count: s?.open_returns_count },
        { href: "/admin/payment-anomalies", key: "nav.admin.paymentAnomalies" },
      ],
    },
    {
      href: "/admin/products",
      key: "nav.admin.products",
      icon: Tag,
      children: [
        { href: "/admin/catalog/categories", key: "nav.admin.categories" },
        { href: "/admin/catalog/tags", key: "nav.admin.tags" },
        { href: "/admin/catalog/attributes", key: "nav.admin.attributes" },
        { href: "/admin/inventory", key: "nav.admin.inventory", count: s?.low_stock_count },
        { href: "/admin/reviews", key: "nav.admin.reviews", count: s?.pending_reviews_count },
      ],
    },
    { href: "/admin/customers", key: "nav.admin.customers", icon: User },
    { href: "/admin/coupons", key: "admin.nav.discounts", icon: TicketPercent },
    { href: "/admin/hero", key: "admin.nav.content", icon: ImageIcon },
    { href: "/admin/reports", key: "admin.nav.analytics", icon: BarChart3 },
  ];
  const settings: NavItem = {
    href: "/admin/settings",
    key: "nav.admin.settings",
    icon: Settings,
    children: [{ href: "/admin/shipping", key: "nav.admin.shipping" }],
  };

  const close = () => setMenuOpen(false);

  const sidebar = (
    <nav aria-label={t("admin.nav.label")} className="flex h-full flex-col px-2 py-3">
      <ul className="space-y-0.5">
        {main.map((item) => (
          <NavSection key={item.href} item={item} pathname={pathname} onNavigate={close} />
        ))}
      </ul>
      <div className="mt-5 px-2 text-xs font-semibold text-admin-muted">{t("admin.nav.salesChannels")}</div>
      <ul className="mt-1 space-y-0.5">
        <li>
          <Link
            href="/"
            target="_blank"
            className="group flex h-8 items-center gap-2 rounded-lg px-2 text-[13px] font-semibold text-[#303030] hover:bg-black/[0.05]"
          >
            <Store className="size-[18px] shrink-0 text-[#4a4a4a]" />
            <span className="truncate">{t("admin.nav.onlineStore")}</span>
            <ExternalLink className="ml-auto size-3.5 text-admin-faint opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        </li>
      </ul>
      <ul className="mt-auto space-y-0.5 pt-6">
        <NavSection item={settings} pathname={pathname} onNavigate={close} />
      </ul>
    </nav>
  );

  return (
    <div className="min-h-screen bg-admin-bg text-[13px] text-admin-text">
      {/* Top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 bg-admin-topbar px-3 text-white sm:px-4">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? t("admin.common.close") : t("admin.nav.openMenu")}
          aria-expanded={menuOpen}
          className="flex size-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 lg:hidden"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <Link href="/admin" className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-white/5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-brand text-sm font-bold">K</span>
          <span className="text-[15px] font-bold tracking-tight">KRIYA</span>
          <span className="hidden rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] font-medium text-white/70 sm:inline">
            {t("admin.nav.badge")}
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="hidden rounded-lg bg-white/10 p-0.5 sm:inline-flex" role="radiogroup" aria-label={t("nav.switchLang")}>
            {(["id", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={locale === l}
                onClick={() => setLocale(l)}
                className={cn(
                  "h-6 rounded-md px-2 text-xs font-semibold uppercase transition-colors",
                  locale === l ? "bg-white text-admin-text" : "text-white/70 hover:text-white",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 text-white/90 outline-none hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white/60"
              aria-label={t("admin.nav.account")}
            >
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#36b37e] text-xs font-bold text-white">
                {initialsOf(user?.email)}
              </span>
              <span className="hidden max-w-40 truncate text-[13px] font-medium md:inline">{user?.email}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <div className="px-2 py-1.5">
                <p className="text-xs text-muted-foreground">{t("admin.nav.signedInAs")}</p>
                <p className="truncate text-sm font-medium">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <div className="flex gap-1 px-1 py-1 sm:hidden">
                {(["id", "en"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLocale(l)}
                    className={cn(
                      "h-7 flex-1 rounded-md text-xs font-semibold uppercase",
                      locale === l ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <DropdownMenuItem onClick={() => router.push("/")}>
                <Store /> {t("nav.backToStore")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut /> {t("nav.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Sidebar desktop */}
      <aside className="fixed bottom-0 left-0 top-14 z-30 hidden w-60 overflow-y-auto bg-admin-nav lg:block">{sidebar}</aside>

      {/* Sidebar mobile (drawer) */}
      {menuOpen && (
        <div className="fixed inset-0 top-14 z-30 lg:hidden">
          <button
            type="button"
            aria-label={t("admin.common.close")}
            onClick={close}
            className="absolute inset-0 bg-black/40"
          />
          <aside className="relative h-full w-64 max-w-[85vw] overflow-y-auto bg-admin-nav shadow-xl">{sidebar}</aside>
        </div>
      )}

      <main className="px-4 pb-10 pt-[4.75rem] sm:px-6 lg:pl-[16.5rem] lg:pr-8">{children}</main>
    </div>
  );
}
