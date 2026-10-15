"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";

import { useLanguage } from "@/components/kriya/language-provider";
import { PaymentAnomalyCard } from "@/components/kriya/admin/payment-anomaly-card";
import { useAdminPaymentAnomalies } from "@/lib/checkout/queries";
import type { PaymentAnomalyFilter } from "@/lib/checkout/types";
import type { MessageKey } from "@/lib/i18n";
import {
  Card,
  EmptyState,
  ErrorState,
  FilterTabs,
  LoadingState,
  Page,
  PageHeader,
  Pager,
} from "@/components/kriya/admin/ui";

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
  const { data, isLoading, isError, refetch } = useAdminPaymentAnomalies(filter, page, PAGE_SIZE);
  const totalPages = data ? Math.ceil(data.meta.total / data.meta.limit) : 0;

  return (
    <Page>
      <PageHeader icon={ShieldAlert} title={t("adminPay.title")} subtitle={t("adminPay.subtitle")} />

      <Card flush className="mb-4">
        <FilterTabs
          tabs={FILTERS.map((f) => ({ value: f.value, label: t(f.key) }))}
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setPage(1);
          }}
        />
      </Card>

      {isLoading ? (
        <Card>
          <LoadingState />
        </Card>
      ) : isError || !data ? (
        <Card>
          <ErrorState message={t("adminPay.error")} onRetry={() => refetch()} />
        </Card>
      ) : data.data.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShieldAlert}
            title={filter === "open" ? t("adminPay.empty.open") : t("adminPay.empty.other")}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {data.data.map((a) => (
            <PaymentAnomalyCard key={a.id} anomaly={a} />
          ))}
          {totalPages > 1 && (
            <Card flush>
              <Pager page={page} totalPages={totalPages} onPage={setPage} />
            </Card>
          )}
        </div>
      )}
    </Page>
  );
}
