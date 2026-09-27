"use client";

import { useState } from "react";
import { useCreateAdminRefund } from "@/lib/aftersales/queries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { Order, OrderItem, CreateRefundRequestItem } from "@/lib/aftersales/types";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { formatRupiah } from "@/lib/format";

export function RefundOrderDialog({ order, className }: { order: Order, className?: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [restock, setRestock] = useState(false);
  const [refundItems, setRefundItems] = useState<Record<string, number>>({});
  
  const createRefund = useCreateAdminRefund();

  const handleRefund = () => {
    const itemsReq: CreateRefundRequestItem[] = [];
    for (const [id, qty] of Object.entries(refundItems)) {
      if (qty > 0) {
        itemsReq.push({ order_item_id: id, qty });
      }
    }

    if (itemsReq.length === 0) {
      alert("Pilih setidaknya 1 item untuk direfund");
      return;
    }

    createRefund.mutate(
      { orderId: order.id, req: { restock, note, items: itemsReq } },
      {
        onSuccess: () => {
          setOpen(false);
          setRefundItems({});
          setNote("");
        },
      }
    );
  };

  const hasItemsToRefund = order.items.some(item => (item.qty - item.refunded_qty) > 0);

  if (!hasItemsToRefund) {
    return null;
  }

  // Calculate preview
  let totalRefund = 0;
  let allRefunded = true;
  for (const item of order.items) {
    const reqQty = refundItems[item.id] || 0;
    if ((item.refunded_qty + reqQty) < item.qty) {
      allRefunded = false;
    }
    if (reqQty > 0) {
      const discountPerQty = Math.floor(item.discount_amount / item.qty);
      const unitRefund = item.price - discountPerQty;
      totalRefund += unitRefund * reqQty;
    }
  }
  let shippingRefund = 0;
  if (allRefunded) {
    shippingRefund = Math.max(0, order.shipping_cost - order.shipping_discount);
    totalRefund += shippingRefund;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 ${className || "ml-2"}`}>
        Proses Refund
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Proses Refund</DialogTitle>
          <DialogDescription>
            Pilih item dan kuantitas yang ingin direfund. Maksimal refund: {formatRupiah(order.refundable_amount || 0)}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Item</h4>
            {order.items.map((item) => {
              const available = item.qty - item.refunded_qty;
              if (available <= 0) return null;
              
              return (
                <div key={item.id} className="flex items-center justify-between gap-4 p-2 border rounded">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">Tersedia: {available} | Harga: {formatRupiah(item.price)}</div>
                  </div>
                  <Input 
                    type="number" 
                    min={0} 
                    max={available}
                    value={refundItems[item.id] || 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setRefundItems({ ...refundItems, [item.id]: Math.min(val, available) });
                    }}
                    className="w-20"
                  />
                </div>
              );
            })}
          </div>

          <div className="bg-neutral-50 p-4 rounded-md">
            <h4 className="font-medium text-sm mb-2">Preview Estimasi</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Total Item Refund:</span>
                <span>{formatRupiah(totalRefund - shippingRefund)}</span>
              </div>
              {shippingRefund > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Ongkir dikembalikan:</span>
                  <span>{formatRupiah(shippingRefund)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>Total Refund:</span>
                <span>{formatRupiah(totalRefund)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="restock" 
              checked={restock}
              onCheckedChange={(c) => setRestock(c as boolean)}
            />
            <label
              htmlFor="restock"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Kembalikan barang ke stok (Restock)
            </label>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Catatan Internal (Opsional)</h4>
            <Textarea 
              placeholder="Alasan refund..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button 
            onClick={handleRefund} 
            disabled={createRefund.isPending || Object.values(refundItems).every(q => q === 0) || totalRefund > (order.refundable_amount || 0)}
          >
            Proses
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
