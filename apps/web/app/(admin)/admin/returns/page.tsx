"use client";

import { useState } from "react";
import { useAdminReturns, useUpdateAdminReturnStatus } from "@/lib/aftersales/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import type { ReturnStatus } from "@/lib/aftersales/types";

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

export default function AdminReturnsPage() {
  const [page] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data, isLoading, isError } = useAdminReturns(statusFilter === "all" ? undefined : statusFilter, page, 20);
  
  const updateStatus = useUpdateAdminReturnStatus();
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const handleUpdateStatus = (id: string, status: ReturnStatus) => {
    updateStatus.mutate({ id, req: { status, admin_note: adminNotes[id] } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kelola Retur</h1>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="requested">Requested</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {isLoading ? (
        <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>
      ) : isError ? (
        <div className="p-8 text-center text-red-500">Error loading returns</div>
      ) : data?.data.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-neutral-500">
          Tidak ada data retur.
        </div>
      ) : (
        <div className="space-y-4">
          {data?.data.map((req) => (
            <div key={req.id} className="rounded-lg border border-neutral-200 bg-white p-6">
              <div className="flex flex-row items-center justify-between pb-4 border-b border-neutral-100 mb-4">
                <h3 className="text-lg font-semibold">
                  Order <Link href={`/admin/orders/${req.order_id}`} className="text-blue-600 hover:underline">#{req.order_number}</Link>
                </h3>
                <Badge className={getStatusColor(req.status)}>
                  {req.status}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-neutral-500 mb-4 grid grid-cols-2 gap-4">
                  <div>
                    <div>Tanggal: {new Date(req.created_at).toLocaleDateString()}</div>
                    <div>Alasan: {req.reason_code}</div>
                  </div>
                  <div>
                    <div className="font-medium text-neutral-900">Deskripsi:</div>
                    <p>{req.description || "-"}</p>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
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

                {req.status === "requested" || req.status === "approved" ? (
                  <div className="space-y-3 pt-4 border-t border-neutral-100">
                    <Input 
                      placeholder="Catatan Admin (opsional)" 
                      value={adminNotes[req.id] || ""}
                      onChange={(e) => setAdminNotes({ ...adminNotes, [req.id]: e.target.value })}
                    />
                    <div className="flex gap-2">
                      {req.status === "requested" && (
                        <>
                          <Button 
                            variant="default" 
                            onClick={() => handleUpdateStatus(req.id, "approved")}
                            disabled={updateStatus.isPending}
                          >
                            Setujui
                          </Button>
                          <Button 
                            variant="destructive" 
                            onClick={() => handleUpdateStatus(req.id, "rejected")}
                            disabled={updateStatus.isPending}
                          >
                            Tolak
                          </Button>
                        </>
                      )}
                      {req.status === "approved" && (
                        <Button 
                          variant="default" 
                          onClick={() => handleUpdateStatus(req.id, "received")}
                          disabled={updateStatus.isPending}
                        >
                          Tandai Diterima
                        </Button>
                      )}
                    </div>
                  </div>
                ) : null}

                {req.status === "received" && (
                  <div className="pt-4 border-t border-neutral-100 flex justify-end">
                    <Link 
                      href={`/admin/orders/${req.order_id}`}
                      className="inline-flex h-9 items-center justify-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-neutral-50 hover:bg-neutral-900/90"
                    >
                      Buka Pesanan untuk Refund
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
