"use client";

import { useOrders } from "@/lib/queries";
import { formatRupiah } from "@/lib/format";
import Link from "next/link";
import { MoveRight, Package } from "lucide-react";
import type { OrderStatus } from "@/lib/types";

function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, { label: string; cls: string }> = {
    pending_payment: { label: "Menunggu Pembayaran", cls: "bg-yellow-100 text-yellow-800" },
    paid: { label: "Dibayar", cls: "bg-green-100 text-green-800" },
    processing: { label: "Diproses", cls: "bg-blue-100 text-blue-800" },
    shipped: { label: "Dikirim", cls: "bg-indigo-100 text-indigo-800" },
    completed: { label: "Selesai", cls: "bg-neutral-100 text-neutral-800" },
    cancelled: { label: "Dibatalkan", cls: "bg-red-100 text-red-800" },
    expired: { label: "Kadaluarsa", cls: "bg-red-100 text-red-800" },
  };
  const { label, cls } = map[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

export default function OrdersPage() {
  const { data: orders, isLoading } = useOrders();

  if (isLoading) return <div className="p-20 text-center">Memuat pesanan...</div>;

  if (!orders || orders.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint text-brand-strong">
          <Package className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-neutral-900">Belum ada pesanan</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-neutral-500">
          Pesanan yang kamu buat akan muncul di sini.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Mulai belanja
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Pesanan Saya</h1>
      
      <div className="mt-8 space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium text-neutral-900">ID: {order.id.split("-")[0]}</p>
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-1 text-sm text-neutral-500">
                  {new Date(order.created_at).toLocaleDateString("id-ID", {
                    year: "numeric", month: "long", day: "numeric"
                  })}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-neutral-500">Total belanja</p>
                <p className="font-medium text-neutral-900">{formatRupiah(order.total)}</p>
              </div>
            </div>

            <div className="mt-6 border-t border-neutral-100 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-600">
                  {order.items.length} macam produk
                </p>
                <Link
                  href={`/orders/${order.id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-strong"
                >
                  Lihat detail
                  <MoveRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
