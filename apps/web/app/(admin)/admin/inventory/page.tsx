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
import { toast } from "sonner";
import { useLanguage } from "@/components/kriya/language-provider";

function MovementHistory({ variantId }: { variantId: string }) {
  const { t } = useLanguage();
  const { data, isLoading } = useMovements(variantId, 1, 20);

  if (isLoading) return <div>{t("adminCatalog.inventory.loading")}</div>;
  if (!data?.data || data.data.length === 0) return <div>{t("adminCatalog.inventory.noHistory")}</div>;

  return (
    <div className="max-h-60 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("adminCatalog.inventory.thTime")}</TableHead>
            <TableHead>{t("adminCatalog.inventory.thReason")}</TableHead>
            <TableHead>{t("adminCatalog.inventory.thDelta")}</TableHead>
            <TableHead>{t("adminCatalog.inventory.thStockAfter")}</TableHead>
            <TableHead>{t("adminCatalog.inventory.thNote")}</TableHead>
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
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(item.stock.toString());
  const [note, setNote] = useState("");
  const adjust = useAdjustment();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedQty = parseInt(qty, 10);
    if (isNaN(parsedQty) || parsedQty < 0) return;
    adjust.mutate(
      { variant_id: item.variant_id, qty: parsedQty, note },
      {
        onSuccess: () => {
          toast.success(t("adminCatalog.inventory.stockUpdated"));
          setOpen(false);
        },
        onError: (err: Error) => {
          toast.error(err.message || t("adminCatalog.inventory.stockFailed"));
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>{t("adminCatalog.inventory.adjust")}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("adminCatalog.inventory.adjustTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("adminCatalog.inventory.currentStock")}</Label>
            <div>{item.stock}</div>
          </div>
          <div className="space-y-2">
            <Label>{t("adminCatalog.inventory.newStock")}</Label>
            <Input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>{t("adminCatalog.inventory.noteLabel")}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("adminCatalog.inventory.notePlaceholder")} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t("adminCatalog.inventory.cancel")}</Button>
            <Button type="submit" disabled={adjust.isPending}>{t("adminCatalog.inventory.save")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminInventoryPage() {
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const { data, isLoading } = useInventory({ q, low_stock: lowStock });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("adminCatalog.inventory.title")}</h1>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder={t("adminCatalog.inventory.search")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
          aria-label={t("adminCatalog.inventory.search")}
        />
        <div className="flex items-center gap-2">
          <Switch checked={lowStock} onCheckedChange={setLowStock} id="low-stock-switch" />
          <Label htmlFor="low-stock-switch">{t("adminCatalog.inventory.lowStockOnly")}</Label>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("adminCatalog.inventory.thProduct")}</TableHead>
              <TableHead>{t("adminCatalog.inventory.thSku")}</TableHead>
              <TableHead>{t("adminCatalog.inventory.thVariant")}</TableHead>
              <TableHead>{t("adminCatalog.inventory.thStock")}</TableHead>
              <TableHead>{t("adminCatalog.inventory.thActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">{t("adminCatalog.inventory.loading")}</TableCell>
              </TableRow>
            ) : data?.data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">{t("adminCatalog.inventory.noItems")}</TableCell>
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
                        <Badge variant="destructive" className="text-[10px]">{t("adminCatalog.inventory.low")}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <AdjustmentDialog item={item} />
                      <Dialog>
                        <DialogTrigger render={<Button variant="ghost" size="sm" />}>{t("adminCatalog.inventory.history")}</DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{t("adminCatalog.inventory.historyTitle", { sku: item.sku })}</DialogTitle>
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
