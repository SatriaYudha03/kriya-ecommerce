"use client";

import { useState } from "react";
import { Loader2, Package } from "lucide-react";
import { useAdminOrders, useUpdateOrderStatus } from "@/lib/admin-queries";
import { formatRupiah } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  pending_payment: { label: "Menunggu Pembayaran", cls: "bg-yellow-100 text-yellow-800" },
  paid: { label: "Dibayar", cls: "bg-green-100 text-green-800" },
  processing: { label: "Diproses", cls: "bg-blue-100 text-blue-800" },
  shipped: { label: "Dikirim", cls: "bg-indigo-100 text-indigo-800" },
  completed: { label: "Selesai", cls: "bg-neutral-100 text-neutral-800" },
  cancelled: { label: "Dibatalkan", cls: "bg-red-100 text-red-800" },
  expired: { label: "Kadaluarsa", cls: "bg-red-100 text-red-800" },
  refunded: { label: "Dikembalikan", cls: "bg-red-100 text-red-800" },
};

const STATUS_KEYS = Object.keys(STATUS) as OrderStatus[];
const LIMIT = 20;

export default function AdminOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useAdminOrders({
    status: status || undefined,
    page,
    limit: LIMIT,
  });
  const updateStatus = useUpdateOrderStatus();

  const orders = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Pesanan Pelanggan</h1>
          <p className="mt-1 text-sm text-neutral-500">{total} pesanan</p>
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrderStatus | "");
            setPage(1);
          }}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Semua status</option>
          {STATUS_KEYS.map((s) => (
            <option key={s} value={s}>
              {STATUS[s].label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Memuat pesanan…
          </div>
        ) : isError ? (
          <div className="py-20 text-center text-sm text-red-600">Gagal memuat pesanan.</div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-neutral-500">
            <Package className="h-8 w-8" />
            <p className="text-sm">Belum ada pesanan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <Th>ID Pesanan</Th>
                  <Th>Tanggal</Th>
                  <Th>Penerima</Th>
                  <Th>Total</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Ubah Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {orders.map((o) => {
                  const rowPending =
                    updateStatus.isPending && updateStatus.variables?.id === o.id;
                  return (
                    <tr key={o.id}>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-neutral-900">
                        {o.id.split("-")[0]}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                        {new Date(o.created_at).toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-700">
                        <div>{o.shipping_address.recipient}</div>
                        <div className="text-xs text-neutral-400">{o.shipping_address.phone}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-900">
                        {formatRupiah(o.total)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[o.status].cls}`}
                        >
                          {STATUS[o.status].label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <select
                          value={o.status}
                          disabled={rowPending}
                          onChange={(e) =>
                            updateStatus.mutate({ id: o.id, status: e.target.value as OrderStatus })
                          }
                          className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm disabled:opacity-50"
                        >
                          {STATUS_KEYS.map((s) => (
                            <option key={s} value={s}>
                              {STATUS[s].label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-neutral-300 px-4 py-2 disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <span className="text-neutral-500">
            Halaman {page} dari {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-neutral-300 px-4 py-2 disabled:opacity-40"
          >
            Berikutnya
          </button>
        </div>
      )}
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 ${className}`}
    >
      {children}
    </th>
  );
}
