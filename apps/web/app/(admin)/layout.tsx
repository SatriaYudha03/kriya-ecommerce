"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Package, ShoppingCart, LogOut, Store, 
  Users, Truck, Settings, Ticket, BarChart3, MessageSquare, Undo2,
  Tags, ListTree, Archive, CheckSquare
} from "lucide-react";
import { useAuth } from "@/components/kriya/auth-provider";
import { AdminGuard } from "@/components/kriya/admin/admin-guard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useAuth();

  const NAV = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/admin/orders", label: "Pesanan", icon: ShoppingCart, exact: true },
    { href: "/admin/products", label: "Produk", icon: Package, exact: false },
    { href: "/admin/catalog/categories", label: "Kategori", icon: ListTree, exact: false },
    { href: "/admin/catalog/tags", label: "Tag", icon: Tags, exact: false },
    { href: "/admin/catalog/attributes", label: "Atribut", icon: CheckSquare, exact: false },
    { href: "/admin/inventory", label: "Inventori", icon: Archive, exact: false },
    { href: "/admin/customers", label: "Pelanggan", icon: Users, exact: false },
    { href: "/admin/shipping", label: "Pengiriman", icon: Truck, exact: false },
    { href: "/admin/coupons", label: "Kupon", icon: Ticket, exact: false },
    { href: "/admin/reports", label: "Laporan", icon: BarChart3, exact: false },
    { href: "/admin/reviews", label: "Ulasan", icon: MessageSquare, exact: false },
    { href: "/admin/returns", label: "Retur", icon: Undo2, exact: false },
    { href: "/admin/settings", label: "Pengaturan", icon: Settings, exact: false },
  ];

  return (
    <div className="flex min-h-screen bg-neutral-100">
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-neutral-200 bg-white overflow-y-auto">
        <div className="flex h-16 shrink-0 items-center border-b border-neutral-200 px-6">
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
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-brand-strong" : "text-neutral-500"}`} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-neutral-200 p-4 shrink-0">
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
