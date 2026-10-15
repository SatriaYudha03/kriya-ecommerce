"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useLanguage } from "@/components/kriya/language-provider";
import { useResolvePaymentAnomaly } from "@/lib/checkout/queries";
import type { PaymentAnomaly, PaymentAnomalyKind, PaymentAnomalyResolution } from "@/lib/checkout/types";
import type { MessageKey } from "@/lib/i18n";
import { formatRupiah } from "@/lib/format";
import { OrderBadge } from "./status-badges";
import { Badge, Button, Card, CardSection, InfoItem, TextArea, TextLink, useAdminFormat } from "./ui";

const KIND_LABEL: Record<PaymentAnomalyKind, MessageKey> = {
  paid_after_close: "adminPay.kind.paid_after_close",
  double_payment: "adminPay.kind.double_payment",
};
const KIND_HINT: Record<PaymentAnomalyKind, MessageKey> = {
  paid_after_close: "adminPay.kindHint.paid_after_close",
  double_payment: "adminPay.kindHint.double_payment",
};
const RESOLUTION_LABEL: Record<PaymentAnomalyResolution, MessageKey> = {
  refunded: "adminPay.resolution.refunded",
  ignored: "adminPay.resolution.ignored",
};

// gross_amount dari Midtrans berupa string desimal ("2450000.00"); null bila tidak terkirim.
function grossToRupiah(gross: string | null): number | null {
  if (gross === null) return null;
  const n = Number(gross);
  return Number.isFinite(n) ? n : null;
}

export function PaymentAnomalyCard({ anomaly }: { anomaly: PaymentAnomaly }) {
  const { t } = useLanguage();
  const fmt = useAdminFormat();
  const resolve = useResolvePaymentAnomaly();
  const [note, setNote] = useState("");
  const open = anomaly.resolved_at === null;
  const amount = grossToRupiah(anomaly.gross_amount);

  function submit(resolution: PaymentAnomalyResolution) {
    const trimmed = note.trim();
    resolve.mutate(
      { id: anomaly.id, payload: { resolution, note: trimmed === "" ? null : trimmed } },
      {
        onSuccess: () => toast.success(t("adminPay.resolve.success")),
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : t("adminPay.resolve.error")),
      },
    );
  }

  return (
    <Card
      flush
      title={
        <span className="flex flex-wrap items-center gap-2">
          <TextLink href={`/admin/orders/${anomaly.order_id}`} className="text-admin-text">
            {anomaly.order_number}
          </TextLink>
          <Badge tone={open ? "critical" : "neutral"} progress={open ? "incomplete" : "complete"}>
            {t(KIND_LABEL[anomaly.kind])}
          </Badge>
        </span>
      }
      description={t("adminPay.detectedAt", { time: fmt.dateTime(anomaly.created_at) })}
      action={
        <div className="text-right">
          <p className="text-base font-semibold tabular-nums">{amount === null ? "—" : formatRupiah(amount)}</p>
          <p className="text-xs text-admin-muted">
            {t("adminPay.orderTotal")}: <span className="tabular-nums">{formatRupiah(anomaly.order_total)}</span>
          </p>
        </div>
      }
    >
      <CardSection className="border-t-0 pt-0">
        <p className="text-admin-muted">{t(KIND_HINT[anomaly.kind])}</p>
        <dl className="mt-3 grid grid-cols-1 gap-3 rounded-xl bg-admin-subdued p-3 sm:grid-cols-2">
          <InfoItem label={t("adminPay.midtransId")}>
            <span className="select-all break-all font-mono text-xs">{anomaly.midtrans_order_id}</span>
          </InfoItem>
          <InfoItem label={t("adminPay.orderStatusAt")}>
            <OrderBadge status={anomaly.order_status} />
          </InfoItem>
        </dl>
      </CardSection>

      {open ? (
        <CardSection subdued>
          <TextArea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
            placeholder={t("adminPay.resolve.notePlaceholder")}
            aria-label={t("adminPay.resolve.notePlaceholder")}
          />
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button onClick={() => submit("ignored")} disabled={resolve.isPending}>
              {t("adminPay.resolve.ignored")}
            </Button>
            <Button variant="primary" onClick={() => submit("refunded")} loading={resolve.isPending}>
              {t("adminPay.resolve.refunded")}
            </Button>
          </div>
        </CardSection>
      ) : (
        <CardSection subdued>
          <p className="font-semibold">
            {anomaly.resolution ? t(RESOLUTION_LABEL[anomaly.resolution]) : "—"}
            {anomaly.resolved_at && (
              <span className="ml-2 font-normal text-admin-muted">
                {t("adminPay.resolvedAt", { time: fmt.dateTime(anomaly.resolved_at) })}
              </span>
            )}
          </p>
          {anomaly.resolution_note && <p className="mt-1 whitespace-pre-line text-admin-muted">{anomaly.resolution_note}</p>}
        </CardSection>
      )}
    </Card>
  );
}
