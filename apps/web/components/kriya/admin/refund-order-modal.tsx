"use client";

// Refund manual per item (pengganti RefundOrderDialog lama). Estimasi dihitung
// sama dengan BE: harga − diskon per unit; ongkir ikut dikembalikan bila semua
// item ter-refund.

import { useState } from "react";
import { useCreateAdminRefund } from "@/lib/aftersales/queries";
import type { CreateRefundRequestItem, Order } from "@/lib/aftersales/types";
import { formatRupiah } from "@/lib/format";
import { useLanguage } from "@/components/kriya/language-provider";
import { Banner, Button, Checkbox, Field, Modal, SummaryRow, TextArea, TextInput, Thumbnail } from "./ui";

export function RefundOrderModal({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const [note, setNote] = useState("");
  const [restock, setRestock] = useState(false);
  const [refundItems, setRefundItems] = useState<Record<string, number>>({});
  const createRefund = useCreateAdminRefund();

  let totalRefund = 0;
  let allRefunded = true;
  for (const item of order.items) {
    const reqQty = refundItems[item.id] || 0;
    if (item.refunded_qty + reqQty < item.qty) allRefunded = false;
    if (reqQty > 0) {
      const discountPerQty = Math.floor(item.discount_amount / item.qty);
      totalRefund += (item.price - discountPerQty) * reqQty;
    }
  }
  const shippingRefund = allRefunded ? Math.max(0, order.shipping_cost - order.shipping_discount) : 0;
  totalRefund += shippingRefund;
  const maxRefund = order.refundable_amount || 0;
  const nothingSelected = Object.values(refundItems).every((q) => q === 0);

  const submit = () => {
    const items: CreateRefundRequestItem[] = Object.entries(refundItems)
      .filter(([, qty]) => qty > 0)
      .map(([order_item_id, qty]) => ({ order_item_id, qty }));
    if (items.length === 0) return;
    createRefund.mutate(
      { orderId: order.id, req: { restock, note, items } },
      {
        onSuccess: () => {
          setRefundItems({});
          setNote("");
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("admin.refund.title")}
      footer={
        <>
          <Button onClick={onClose}>{t("admin.common.cancel")}</Button>
          <Button
            variant="primary"
            loading={createRefund.isPending}
            disabled={nothingSelected || totalRefund > maxRefund}
            onClick={submit}
          >
            {t("admin.refund.submit", { amount: formatRupiah(totalRefund) })}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-admin-muted">{t("admin.refund.desc", { max: formatRupiah(maxRefund) })}</p>
      <div className="divide-y divide-admin-border rounded-xl border border-admin-border">
        {order.items.map((item) => {
          const available = item.qty - item.refunded_qty;
          if (available <= 0) return null;
          return (
            <div key={item.id} className="flex items-center gap-3 p-3">
              <Thumbnail src={item.thumbnail_url} alt={item.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.name}</p>
                <p className="text-xs text-admin-muted">
                  {formatRupiah(item.price)} · {t("admin.refund.available", { n: available })}
                </p>
              </div>
              <TextInput
                type="number"
                min={0}
                max={available}
                aria-label={t("admin.refund.qty")}
                suffix={`/ ${available}`}
                className="w-24"
                value={refundItems[item.id] || 0}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setRefundItems({ ...refundItems, [item.id]: Math.max(0, Math.min(val, available)) });
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-2 rounded-xl bg-admin-subdued p-3">
        <SummaryRow label={t("admin.refund.items")} value={formatRupiah(totalRefund - shippingRefund)} />
        {shippingRefund > 0 && <SummaryRow label={t("admin.refund.shipping")} value={formatRupiah(shippingRefund)} />}
        <div className="border-t border-admin-border pt-2">
          <SummaryRow strong label={t("admin.refund.total")} value={formatRupiah(totalRefund)} />
        </div>
      </div>
      {totalRefund > maxRefund && (
        <Banner tone="critical" className="mt-3">
          {t("admin.refund.overLimit")}
        </Banner>
      )}

      <div className="mt-4 space-y-4">
        <Checkbox
          label={t("admin.refund.restock")}
          help={t("admin.refund.restockHint")}
          checked={restock}
          onChange={(e) => setRestock(e.target.checked)}
        />
        <Field label={t("admin.refund.note")} htmlFor="refund-note">
          <TextArea id="refund-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
