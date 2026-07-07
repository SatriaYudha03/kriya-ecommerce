import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import { getOrders } from "@/lib/api";
import { Plus } from "lucide-react";

export default async function AdminProductsPage() {
  // We mock the products listing for now in M6 scaffold
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Manajemen Produk</h1>
        <button className="flex items-center gap-2 rounded-lg bg-brand-strong px-4 py-2 text-sm font-medium text-white hover:bg-brand">
          <Plus className="h-4 w-4" /> Tambah Produk
        </button>
      </div>
      
      <div className="mt-8 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Produk</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Kategori</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Harga (Min)</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white">
            <tr>
              <td className="whitespace-nowrap px-6 py-4">TARU work desk</td>
              <td className="whitespace-nowrap px-6 py-4">Workspace</td>
              <td className="whitespace-nowrap px-6 py-4">{formatRupiah(1800000)}</td>
              <td className="whitespace-nowrap px-6 py-4 text-right">
                <Link href="#" className="text-sm font-medium text-brand hover:text-brand-strong">Edit</Link>
              </td>
            </tr>
            {/* mock data row */}
          </tbody>
        </table>
      </div>
    </div>
  );
}
