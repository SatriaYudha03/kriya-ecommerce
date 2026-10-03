"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { useLanguage } from "@/components/kriya/language-provider";
import { Pagination } from "@/components/kriya/pagination";
import { PaymentAnomalyCard } from "@/components/kriya/admin/payment-anomaly-card";
import { useAdminPaymentAnomalies } from "@/lib/checkout/queries";
import type { PaymentAnomalyFilter } from "@/lib/checkout/types";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const FILTERS: { value: PaymentAnomalyFilter; key: MessageKey }[] = [
  { value: "open", key: "adminPay.filter.open" },
  { value: "resolved", key: "adminPay.filter.resolved" },
  { value: "all", key: "adminPay.filter.all" },
];

// Anomali pembayaran (RENCANA-PAYMENT-LIFECYCLE Fase 6): uang pembeli yang masuk tetapi
// tidak bisa diterima pesanannya — wajib di-refund manual lalu ditandai di sini.
export default function AdminPaymentAnomaliesPage() {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<PaymentAnomalyFilter>("open");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useAdminPaymentAnomalies(filter, page, PAGE_SIZE);
  const totalPages = data ? Math.ceil(data.meta.total / data.meta.limit) : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{t("adminPay.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-500">{t("adminPay.subtitle")}</p>
        </div>
        <div className="flex shrink-0 rounded-full border border-stone-200 bg-white p-1 text-sm" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => {
                setFilter(f.value);
                setPage(1);
              }}
              className={cn(
                "rounded-full px-3 py-1.5 font-medium transition-colors",
                filter === f.value ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100",
              )}
            >
              {t(f.key)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12 text-stone-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : isError || !data ? (
        <div className="rounded-2xl border border-red-200 bg-white p-8 text-center text-sm text-red-600">
          {t("adminPay.error")}
        </div>
      ) : data.data.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-sm text-stone-500">
          {filter === "open" ? t("adminPay.empty.open") : t("adminPay.empty.other")}
        </div>
      ) : (
        <div className="space-y-4">
          {data.data.map((a) => (
            <PaymentAnomalyCard key={a.id} anomaly={a} />
          ))}
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
