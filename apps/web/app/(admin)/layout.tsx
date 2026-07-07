import Link from "next/link";
import { LayoutDashboard, Package, ShoppingCart, LogOut } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Normally here we would check user role, but for scaffold we just render UI
  return (
    <div className="flex min-h-screen bg-neutral-100">
      <aside className="w-64 border-r border-neutral-200 bg-white">
        <div className="flex h-16 items-center border-b border-neutral-200 px-6">
          <Link href="/admin" className="text-xl font-bold tracking-tight text-neutral-900">
            KRIYA <span className="text-brand-strong">Admin</span>
          </Link>
        </div>
        <nav className="p-4 space-y-1">
          <Link href="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100">
            <LayoutDashboard className="h-4 w-4 text-neutral-500" /> Dashboard
          </Link>
          <Link href="/admin/pesanan" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
            <ShoppingCart className="h-4 w-4 text-neutral-500" /> Pesanan
          </Link>
          <Link href="/admin/produk" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
            <Package className="h-4 w-4 text-neutral-500" /> Produk
          </Link>
        </nav>
        <div className="absolute bottom-4 w-64 px-4">
          <Link href="/" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
            <LogOut className="h-4 w-4 text-neutral-500" /> Kembali ke Toko
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
