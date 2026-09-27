"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminOrder, updateAdminOrderStatus, addAdminOrderNote } from "@/lib/aftersales/api";
import { formatRupiah } from "@/lib/format";
import type { OrderStatus } from "@/lib/aftersales/types";
import { OrderStatusBadge } from "@/components/kriya/aftersales/order-status-badge";
import Link from "next/link";
import { ArrowLeft, Package, Loader2 } from "lucide-react";
import { RefundOrderDialog } from "@/components/kriya/aftersales/refund-order-dialog";

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const queryClient = useQueryClient();
  const [statusInput, setStatusInput] = useState<OrderStatus | "">("");
  const [courier, setCourier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  
  const [noteBody, setNoteBody] = useState("");
  const [isCustomerVisible, setIsCustomerVisible] = useState(false);

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["admin_orders", params.id],
    queryFn: () => getAdminOrder(params.id),
  });

  const statusMut = useMutation({
    mutationFn: () => updateAdminOrderStatus(params.id, statusInput as OrderStatus, undefined, courier || undefined, trackingNumber || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_orders"] });
      setStatusInput("");
      setCourier("");
      setTrackingNumber("");
    }
  });

  const noteMut = useMutation({
    mutationFn: () => addAdminOrderNote(params.id, noteBody, isCustomerVisible),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_orders", params.id] });
      setNoteBody("");
      setIsCustomerVisible(false);
    }
  });

  if (isLoading) return <div className="p-20 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  if (isError || !order) return <div className="p-20 text-center text-red-500">Order not found</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href="/admin/orders" className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar
      </Link>
      
      <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold uppercase font-mono">{order.id.split("-")[0]}</h1>
          <p className="text-sm text-neutral-500">{new Date(order.created_at).toLocaleString("id-ID")}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg border border-neutral-200">
            <h2 className="font-semibold text-lg mb-4">Item Pesanan</h2>
            <div className="divide-y">
              {order.items.map((item) => (
                <div key={item.id} className="py-3 flex gap-4">
                  <div className="h-16 w-16 bg-neutral-100 rounded overflow-hidden">
                     {item.thumbnail_url ? <img src={item.thumbnail_url} alt="" className="object-cover w-full h-full" /> : <Package className="w-full h-full p-4 text-neutral-300" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-neutral-500">{item.color} {item.size && `/ ${item.size}`}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{item.qty} x {formatRupiah(item.price)}</p>
                    <p className="font-semibold">{formatRupiah(item.subtotal)}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t flex justify-between font-semibold">
              <span>Total Keseluruhan</span>
              <span>{formatRupiah(order.total)}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-neutral-200">
            <h2 className="font-semibold text-lg mb-4">Catatan Admin</h2>
            <div className="space-y-4 mb-6">
              {order.notes?.map(n => (
                <div key={n.id} className={`p-3 rounded text-sm ${n.is_customer_visible ? 'bg-yellow-50 text-yellow-800' : 'bg-neutral-50 text-neutral-800'}`}>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold">{n.author_name || 'Admin'} {n.is_customer_visible && '(Publik)'}</span>
                    <span className="text-xs opacity-75">{new Date(n.created_at).toLocaleString("id-ID")}</span>
                  </div>
                  <p>{n.body}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <textarea 
                className="w-full border rounded p-2 text-sm" 
                rows={3} 
                placeholder="Tambah catatan..."
                value={noteBody}
                onChange={e => setNoteBody(e.target.value)}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={isCustomerVisible} onChange={e => setIsCustomerVisible(e.target.checked)} />
                  Terlihat oleh pelanggan
                </label>
                <button 
                  disabled={noteMut.isPending || !noteBody.trim()}
                  onClick={() => noteMut.mutate()}
                  className="bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                >
                  {noteMut.isPending ? 'Menyimpan...' : 'Simpan Catatan'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-neutral-200">
            <h2 className="font-semibold mb-4">Perbarui Status</h2>
            <div className="space-y-3">
              <select className="w-full border rounded p-2 text-sm" value={statusInput} onChange={e => setStatusInput(e.target.value as OrderStatus)}>
                <option value="">Pilih Status Baru...</option>
                <option value="processing">Diproses</option>
                <option value="shipped">Dikirim</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Dibatalkan</option>
                <option value="refunded">Dikembalikan</option>
              </select>
              
              {statusInput === "shipped" && (
                <div className="space-y-2 pt-2">
                  <input type="text" placeholder="Kurir (mis. JNE, Gojek)" className="w-full border rounded p-2 text-sm" value={courier} onChange={e => setCourier(e.target.value)} />
                  <input type="text" placeholder="Nomor Resi" className="w-full border rounded p-2 text-sm" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} />
                </div>
              )}

              <button 
                disabled={!statusInput || statusMut.isPending}
                onClick={() => statusMut.mutate()}
                className="w-full bg-blue-600 text-white rounded p-2 text-sm font-medium disabled:opacity-50"
              >
                {statusMut.isPending ? 'Memperbarui...' : 'Perbarui Status'}
              </button>
            </div>
            
            {order.status === "completed" || order.status === "cancelled" || order.status === "refunded" ? (
              <div className="mt-6 border-t pt-4">
                <h3 className="font-semibold text-sm mb-2 text-neutral-900">Refund Manual</h3>
                <p className="text-xs text-neutral-500 mb-3">
                  Proses refund sebagian atau seluruhnya.
                </p>
                <div className="w-full">
                  <RefundOrderDialog order={order} className="w-full" />
                </div>
              </div>
            ) : null}
          </div>

          <div className="bg-white p-6 rounded-lg border border-neutral-200">
            <h2 className="font-semibold mb-4">Informasi Pengiriman</h2>
            <div className="text-sm space-y-2 text-neutral-600">
              <p className="font-semibold text-neutral-900">{order.shipping_address.recipient}</p>
              <p>{order.shipping_address.phone}</p>
              <p>{order.shipping_address.address_line}</p>
              <p>{order.shipping_address.city}, {order.shipping_address.province} {order.shipping_address.postal_code}</p>
              {order.courier && <p className="pt-2">Kurir: <strong>{order.courier}</strong></p>}
              {order.tracking_number && <p>Resi: <strong>{order.tracking_number}</strong></p>}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-neutral-200">
            <h2 className="font-semibold mb-4">Timeline (Attempts)</h2>
            <div className="space-y-3 text-sm">
              {order.timeline?.map((ev, i) => (
                <div key={i} className="flex gap-3">
                  <div className="text-neutral-500 whitespace-nowrap">{new Date(ev.created_at).toLocaleDateString("id-ID", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                  <div>
                    <span className="font-medium"><OrderStatusBadge status={ev.status as OrderStatus} /></span>
                    {ev.note && <div className="text-neutral-500 mt-1">{ev.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
