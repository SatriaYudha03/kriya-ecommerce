"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/components/kriya/language-provider";
import { useCancelOrder } from "@/lib/aftersales/queries";
import { Loader2, XCircle } from "lucide-react";
import type { MessageKey } from "@/lib/i18n";

interface CancelOrderDialogProps {
  orderId: string;
}

export function CancelOrderDialog({ orderId }: CancelOrderDialogProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const cancelMutation = useCancelOrder();

  const handleCancel = () => {
    if (!reason.trim()) return;
    cancelMutation.mutate(
      { id: orderId, reason },
      {
        onSuccess: () => {
          setOpen(false);
          setReason("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-50 border border-neutral-200 bg-white hover:bg-neutral-100 h-10 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50">
        <XCircle className="mr-2 h-4 w-4" />
        {t("after.orders.cancel.button" as MessageKey)}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("after.orders.cancel.title" as MessageKey)}</DialogTitle>
          <DialogDescription>
            {t("after.orders.cancel.description" as MessageKey)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="reason" className="text-sm font-medium">
              {t("after.orders.cancel.reasonLabel" as MessageKey)}
            </label>
            <Textarea
              id="reason"
              placeholder={t("after.orders.cancel.reasonPlaceholder" as MessageKey)}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={cancelMutation.isPending}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={cancelMutation.isPending}>
            {t("after.orders.cancel.close" as MessageKey)}
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={!reason.trim() || cancelMutation.isPending}
          >
            {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("after.orders.cancel.confirm" as MessageKey)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
