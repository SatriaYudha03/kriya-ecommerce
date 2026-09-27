"use client";

import { useState } from "react";
import { useReturns } from "@/lib/aftersales/queries";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import Image from "next/image";

function getStatusColor(status: string) {
  switch (status) {
    case "requested": return "bg-yellow-500";
    case "approved": return "bg-blue-500";
    case "received": return "bg-purple-500";
    case "refunded": return "bg-green-500";
    case "rejected":
    case "cancelled": return "bg-red-500";
    default: return "bg-gray-500";
  }
}

export default function CustomerReturnsPage() {
  const [page] = useState(1);
  const { data, isLoading, isError } = useReturns(page, 10);

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (isError) return <div className="p-8 text-center text-red-500">Error loading returns</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Daftar Retur</h1>
      
      {data?.data.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-neutral-500">
          Belum ada retur.
        </div>
      ) : (
        <div className="space-y-4">
          {data?.data.map((req) => (
            <div key={req.id} className="rounded-lg border border-neutral-200 bg-white p-6">
              <div className="flex flex-row items-center justify-between pb-4 border-b border-neutral-100 mb-4">
                <h3 className="text-lg font-semibold">
                  Order #{req.order_number}
                </h3>
                <Badge className={getStatusColor(req.status)}>
                  {req.status}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-neutral-500 mb-4">
                  <div>Tanggal: {new Date(req.created_at).toLocaleDateString()}</div>
                  <div>Alasan: {req.reason_code}</div>
                  {req.admin_note && <div>Catatan Admin: {req.admin_note}</div>}
                </div>
                
                <div className="space-y-2">
                  {req.items.map((item) => (
                    <div key={item.order_item_id} className="flex gap-4 items-center">
                      {item.thumbnail_url && (
                        <Image src={item.thumbnail_url} alt={item.product_name} width={40} height={40} className="rounded" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.product_name}</div>
                        <div className="text-sm text-neutral-500">Qty: {item.qty}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex justify-end">
                  <Link 
                    href={`/orders/${req.order_id}`}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-200 bg-white px-4 text-sm font-medium hover:bg-neutral-100 hover:text-neutral-900"
                  >
                    Lihat Pesanan
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
