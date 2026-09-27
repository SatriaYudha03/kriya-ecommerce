"use client";

import { useState } from "react";
import { useInventory, useMovements, useAdjustment } from "@/lib/catalog/queries";
import type { InventoryItem } from "@/lib/catalog/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/components/kriya/language-provider";
import { toast } from "sonner";

function MovementHistory({ variantId }: { variantId: string }) {
  const { data, isLoading } = useMovements(variantId, 1, 20);

  if (isLoading) return <div>Loading...</div>;
  if (!data?.data || data.data.length === 0) return <div>No history.</div>;

  return (
    <div className="max-h-60 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Delta</TableHead>
            <TableHead>Stock After</TableHead>
            <TableHead>Note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.data.map((m) => (
            <TableRow key={m.id}>
              <TableCell>{new Date(m.created_at).toLocaleString()}</TableCell>
              <TableCell>{m.reason}</TableCell>
              <TableCell>{m.delta > 0 ? `+${m.delta}` : m.delta}</TableCell>
              <TableCell>{m.stock_after}</TableCell>
              <TableCell>{m.note || "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AdjustmentDialog({ item }: { item: InventoryItem }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(item.stock.toString());
  const [note, setNote] = useState("");
  const adjust = useAdjustment();
  const { t } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedQty = parseInt(qty, 10);
    if (isNaN(parsedQty) || parsedQty < 0) return;
    adjust.mutate(
      { variant_id: item.variant_id, qty: parsedQty, note },
      {
        onSuccess: () => {
          toast.success("Stock updated");
          setOpen(false);
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to update stock");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Adjust</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Current Stock</Label>
            <div>{item.stock}</div>
          </div>
          <div className="space-y-2">
            <Label>New Stock Quantity</Label>
            <Input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Note / Reason</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="E.g., damage, recount" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={adjust.isPending}>Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminInventoryPage() {
  const [q, setQ] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const { t } = useLanguage();

  const { data, isLoading } = useInventory({ q, low_stock: lowStock });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventory</h1>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search product or SKU..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Switch checked={lowStock} onCheckedChange={setLowStock} id="low-stock-switch" />
          <Label htmlFor="low-stock-switch">Low Stock Only</Label>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : data?.data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">No items found.</TableCell>
              </TableRow>
            ) : (
              data?.data?.map((item) => (
                <TableRow key={item.variant_id}>
                  <TableCell className="font-medium">
                    {item.product_name}
                  </TableCell>
                  <TableCell>{item.sku}</TableCell>
                  <TableCell>
                    {item.color} {item.size ? `/ ${item.size}` : ""}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{item.stock}</span>
                      {item.low_stock && (
                        <Badge variant="destructive" className="text-[10px]">Low</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <AdjustmentDialog item={item} />
                      <Dialog>
                        <DialogTrigger render={<Button variant="ghost" size="sm" />}>History</DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Stock History - {item.sku}</DialogTitle>
                          </DialogHeader>
                          <MovementHistory variantId={item.variant_id} />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
