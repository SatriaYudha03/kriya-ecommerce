"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MoveLeft, Receipt } from "lucide-react";
import { useOrder } from "@/lib/queries";
import { formatRupiah } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";

  function StatusBadge({ status }: { status: OrderStatus }) {
    const map: Record<OrderStatus, { label: string; cls: string }> = {
      pending_payment: { label: "Menunggu Pembayaran", cls: "bg-yellow-100 text-yellow-800" },
      paid: { label: "Dibayar", cls: "bg-green-100 text-green-800" },
      processing: { label: "Diproses", cls: "bg-blue-100 text-blue-800" },
      shipped: { label: "Dikirim", cls: "bg-indigo-100 text-indigo-800" },
      completed: { label: "Selesai", cls: "bg-neutral-100 text-neutral-800" },
      cancelled: { label: "Dibatalkan", cls: "bg-red-100 text-red-800" },
      expired: { label: "Kadaluarsa", cls: "bg-red-100 text-red-800" },
      refunded: { label: "Dikembalikan", cls: "bg-red-100 text-red-800" },
    };
  const { label, cls } = map[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ${cls}`}>
      {label}
    </span>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useOrder(id);
  const queryClient = useQueryClient();

  // Polling if pending payment
  useEffect(() => {
    if (!order || order.status !== "pending_payment") return;
    
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
    }, 10000);
    
    return () => clearInterval(interval);
  }, [order, id, queryClient]);

  if (isLoading) return <div className="p-20 text-center">Memuat detail pesanan...</div>;
  if (!order) return <div className="p-20 text-center">Pesanan tidak ditemukan</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link href="/orders" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900">
          <MoveLeft className="h-4 w-4" />
          Kembali ke daftar pesanan
        </Link>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
        <div className="border-b border-neutral-200 bg-neutral-50 p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
                Pesanan #{order.id.split("-")[0]}
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                Dibuat pada {new Date(order.created_at).toLocaleString("id-ID")}
              </p>
            </div>
            <StatusBadge status={order.status} />
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-base font-medium text-neutral-900 mb-4">Alamat Pengiriman</h2>
              <address className="not-italic text-sm text-neutral-600 space-y-1">
                <p className="font-medium text-neutral-900">{order.shipping_address.recipient}</p>
                <p>{order.shipping_address.phone}</p>
                <p>{order.shipping_address.address_line}</p>
                <p>{order.shipping_address.city}, {order.shipping_address.province} {order.shipping_address.postal_code}</p>
              </address>
            </div>
            
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <h2 className="text-base font-medium text-neutral-900 flex items-center gap-2 mb-4">
                <Receipt className="h-4 w-4" />
                Ringkasan Biaya
              </h2>
              <dl className="space-y-2 text-sm text-neutral-600">
                <div className="flex justify-between">
                  <dt>Subtotal produk</dt>
                  <dd>{formatRupiah(order.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Biaya pengiriman</dt>
                  <dd>{formatRupiah(order.shipping_cost)}</dd>
                </div>
                <div className="flex justify-between border-t border-neutral-200 pt-2 font-medium text-neutral-900">
                  <dt>Total Belanja</dt>
                  <dd>{formatRupiah(order.total)}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-base font-medium text-neutral-900 mb-4">Produk yang Dipesan</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-neutral-200 text-neutral-500">
                  <tr>
                    <th className="pb-3 font-medium">Produk</th>
                    <th className="pb-3 font-medium text-right">Harga</th>
                    <th className="pb-3 font-medium text-right">Jumlah</th>
                    <th className="pb-3 font-medium text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {order.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-4">
                        <p className="font-medium text-neutral-900">{item.name}</p>
                        <p className="text-neutral-500 text-xs mt-0.5">
                          {item.color} {item.size && `· ${item.size}`}
                        </p>
                      </td>
                      <td className="py-4 text-right text-neutral-600">{formatRupiah(item.price)}</td>
                      <td className="py-4 text-right text-neutral-600">{item.qty}</td>
                      <td className="py-4 text-right font-medium text-neutral-900">{formatRupiah(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
