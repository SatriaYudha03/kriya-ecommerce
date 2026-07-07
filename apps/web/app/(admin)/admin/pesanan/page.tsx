import Link from "next/link";
import { formatRupiah } from "@/lib/format";

export default async function AdminOrdersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Pesanan Pelanggan</h1>
      
      <div className="mt-8 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">ID Pesanan</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Tanggal</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Total</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white">
            <tr>
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-neutral-900">o1000000</td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">08 Jul 2026</td>
              <td className="whitespace-nowrap px-6 py-4 text-sm">
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Paid</span>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-900">{formatRupiah(1950000)}</td>
              <td className="whitespace-nowrap px-6 py-4 text-right">
                <select className="text-sm border-neutral-300 rounded-md">
                  <option>Paid</option>
                  <option>Processing</option>
                  <option>Shipped</option>
                  <option>Completed</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
