"use client";

import { useState } from "react";
import { useCreateReturn } from "@/lib/aftersales/queries";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReturnReasonCode, OrderItem, CreateReturnRequestItem } from "@/lib/aftersales/types";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/kriya/language-provider";
import type { MessageKey } from "@/lib/i18n";

export function ReturnOrderDialog({ orderId, items }: { orderId: string, items: OrderItem[] }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState<ReturnReasonCode>("other");
  const [description, setDescription] = useState("");
  const [returnItems, setReturnItems] = useState<Record<string, number>>({});
  
  const createReturn = useCreateReturn();

  const handleReturn = () => {
    const itemsReq: CreateReturnRequestItem[] = [];
    for (const [id, qty] of Object.entries(returnItems)) {
      if (qty > 0) {
        itemsReq.push({ order_item_id: id, qty });
      }
    }

    if (itemsReq.length === 0) {
      alert(t("after.returns.alertMinItem" as MessageKey));
      return;
    }

    createReturn.mutate(
      { orderId, req: { reason_code: reasonCode, description, items: itemsReq } },
      {
        onSuccess: () => {
          setOpen(false);
          setReturnItems({});
          setDescription("");
        },
      }
    );
  };

  const hasItemsToReturn = items.some(item => (item.qty - item.refunded_qty) > 0);

  if (!hasItemsToReturn) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 border border-neutral-200 bg-white hover:bg-neutral-100 hover:text-neutral-900 h-10 px-4 py-2 ml-2">
        {t("after.returns.button" as MessageKey)}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("after.returns.dialogTitle" as MessageKey)}</DialogTitle>
          <DialogDescription>
            {t("after.returns.dialogDescription" as MessageKey)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">{t("after.returns.itemsLabel" as MessageKey)}</h4>
            {items.map((item) => {
              const available = item.qty - item.refunded_qty;
              if (available <= 0) return null;
              
              return (
                <div key={item.id} className="flex items-center justify-between gap-4 p-2 border rounded">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{t("after.reviews.available" as MessageKey)}: {available}</div>
                  </div>
                  <Input 
                    type="number" 
                    min={0} 
                    max={available}
                    value={returnItems[item.id] || 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setReturnItems({ ...returnItems, [item.id]: Math.min(val, available) });
                    }}
                    className="w-20"
                  />
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">{t("after.returns.reasonLabel" as MessageKey)}</h4>
            <Select value={reasonCode} onValueChange={(v) => setReasonCode(v as ReturnReasonCode)}>
              <SelectTrigger>
                <SelectValue placeholder={t("after.returns.selectReasonPlaceholder" as MessageKey)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="damaged">{t("after.returns.reasonDamaged" as MessageKey)}</SelectItem>
                <SelectItem value="wrong_item">{t("after.returns.reasonWrongItem" as MessageKey)}</SelectItem>
                <SelectItem value="not_as_described">{t("after.returns.reasonNotAsDescribed" as MessageKey)}</SelectItem>
                <SelectItem value="missing_parts">{t("after.returns.reasonMissingParts" as MessageKey)}</SelectItem>
                <SelectItem value="changed_mind">{t("after.returns.reasonChangedMind" as MessageKey)}</SelectItem>
                <SelectItem value="other">{t("after.returns.reasonOther" as MessageKey)}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">{t("after.returns.descriptionOptionalLabel" as MessageKey)}</h4>
            <Textarea 
              placeholder={t("after.returns.descriptionDetailPlaceholder" as MessageKey)}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>{t("after.returns.cancel" as MessageKey)}</Button>
          <Button 
            onClick={handleReturn} 
            disabled={createReturn.isPending || Object.values(returnItems).every(q => q === 0)}
          >
            {t("after.returns.submitRequest" as MessageKey)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
