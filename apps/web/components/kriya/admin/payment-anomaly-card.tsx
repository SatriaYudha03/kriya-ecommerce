"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/components/kriya/language-provider";
import { OrderStatusBadge } from "@/components/kriya/aftersales/order-status-badge";
import { useResolvePaymentAnomaly } from "@/lib/checkout/queries";
import type { PaymentAnomaly, PaymentAnomalyKind, PaymentAnomalyResolution } from "@/lib/checkout/types";
import type { MessageKey } from "@/lib/i18n";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

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
  const { t, locale } = useLanguage();
  const resolve = useResolvePaymentAnomaly();
  const [note, setNote] = useState("");
  const open = anomaly.resolved_at === null;
  const amount = grossToRupiah(anomaly.gross_amount);
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  function submit(resolution: PaymentAnomalyResolution) {
    const trimmed = note.trim();
    resolve.mutate(
      { id: anomaly.id, payload: { resolution, note: trimmed === "" ? null : trimmed } },
      {
        onSuccess: () => toast.success(t("adminPay.resolve.success")),
        onError: (err: unknown) =>
          toast.error(err instanceof Error ? err.message : t("adminPay.resolve.error")),
      },
    );
  }

  return (
    <article
      className={cn(
        "rounded-2xl border bg-white p-5 shadow-sm",
        open ? "border-red-200" : "border-stone-200",
      )}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
              open ? "bg-red-50 text-red-700" : "bg-stone-100 text-stone-600",
            )}
          >
            {open ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {t(KIND_LABEL[anomaly.kind])}
          </p>
          <h2 className="mt-2 text-base font-semibold text-stone-900">
            <Link href={`/admin/orders/${anomaly.order_id}`} className="hover:underline">
              {anomaly.order_number}
            </Link>
          </h2>
          <p className="mt-0.5 text-xs text-stone-500">{t("adminPay.detectedAt", { time: fmtTime(anomaly.created_at) })}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs text-stone-500">{t("adminPay.amount")}</p>
          <p className="text-xl font-semibold tabular-nums text-stone-900">
            {amount === null ? "—" : formatRupiah(amount)}
          </p>
          <p className="text-xs text-stone-500">
            {t("adminPay.orderTotal")}: <span className="tabular-nums">{formatRupiah(anomaly.order_total)}</span>
          </p>
        </div>
      </header>

      <p className="mt-4 text-sm text-stone-600">{t(KIND_HINT[anomaly.kind])}</p>

      <dl className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-stone-50 p-3 text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-xs text-stone-500">{t("adminPay.midtransId")}</dt>
          <dd className="mt-0.5 select-all break-all font-mono text-stone-900">{anomaly.midtrans_order_id}</dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">{t("adminPay.orderStatusAt")}</dt>
          <dd className="mt-1">
            <OrderStatusBadge status={anomaly.order_status} />
          </dd>
        </div>
      </dl>

      {open ? (
        <div className="mt-4 space-y-3 border-t border-stone-100 pt-4">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
            placeholder={t("adminPay.resolve.notePlaceholder")}
            aria-label={t("adminPay.resolve.notePlaceholder")}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => submit("refunded")} disabled={resolve.isPending}>
              {resolve.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("adminPay.resolve.refunded")}
            </Button>
            <Button variant="outline" onClick={() => submit("ignored")} disabled={resolve.isPending}>
              {t("adminPay.resolve.ignored")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 border-t border-stone-100 pt-4 text-sm">
          <p className="font-medium text-stone-900">
            {anomaly.resolution ? t(RESOLUTION_LABEL[anomaly.resolution]) : "—"}
            {anomaly.resolved_at && (
              <span className="ml-2 font-normal text-stone-500">
                {t("adminPay.resolvedAt", { time: fmtTime(anomaly.resolved_at) })}
              </span>
            )}
          </p>
          {anomaly.resolution_note && <p className="mt-1 whitespace-pre-line text-stone-600">{anomaly.resolution_note}</p>}
        </div>
      )}
    </article>
  );
}
