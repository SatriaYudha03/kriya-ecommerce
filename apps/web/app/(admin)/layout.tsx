"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, LogOut, Store } from "lucide-react";
import { useAuth } from "@/components/kriya/auth-provider";
import { AdminGuard } from "@/components/kriya/admin/admin-guard";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Pesanan", icon: ShoppingCart, exact: false },
  { href: "/admin/products", label: "Produk", icon: Package, exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-neutral-100">
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-neutral-200 bg-white">
        <div className="flex h-16 items-center border-b border-neutral-200 px-6">
          <Link href="/admin" className="text-xl font-bold tracking-tight text-neutral-900">
            KRIYA <span className="text-brand-strong">Admin</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  active
                    ? "bg-brand-tint text-brand-strong"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-brand-strong" : "text-neutral-500"}`} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-neutral-200 p-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
          >
            <Store className="h-4 w-4 text-neutral-500" /> Kembali ke Toko
          </Link>
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
          >
            <LogOut className="h-4 w-4 text-neutral-500" /> Keluar
          </button>
        </div>
      </aside>
      <main className="ml-64 flex-1 p-8">
        <AdminGuard>{children}</AdminGuard>
      </main>
    </div>
  );
}
