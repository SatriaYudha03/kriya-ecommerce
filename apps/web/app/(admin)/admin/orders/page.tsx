"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Inbox } from "lucide-react";
import { useAdminOrders, useUpdateOrderStatus } from "@/lib/aftersales/queries";
import { formatRupiah } from "@/lib/format";
import type { OrderStatus } from "@/lib/aftersales/types";
import { useLanguage } from "@/components/kriya/language-provider";
import { OrderBadge, normalizeOrderStatus } from "@/components/kriya/admin/status-badges";
import { ShipOrderModal } from "@/components/kriya/admin/ship-order-modal";
import {
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  FilterTabs,
  IndexToolbar,
  Page,
  PageHeader,
  Pager,
  SelectInput,
  SkeletonRows,
  Td,
  Th,
  Tr,
  stopRow,
  useAdminFormat,
} from "@/components/kriya/admin/ui";

const STATUS_KEYS: OrderStatus[] = [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "completed",
  "cancelled",
  "expired",
];

const LIMIT = 20;

type Tab = OrderStatus | "all";

function OrdersIndex() {
  const { t } = useLanguage();
  const fmt = useAdminFormat();
  const params = useSearchParams();
  // Tautan dari dashboard: /admin/orders?status=processing (atau alias lama "pending").
  const initial = normalizeOrderStatus(params.get("status") ?? "");
  const [status, setStatus] = useState<Tab>(initial ?? "all");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useAdminOrders({
    status: status === "all" ? undefined : status,
    page,
    limit: LIMIT,
  });
  const updateStatus = useUpdateOrderStatus();
  const [shipOrderId, setShipOrderId] = useState<string | null>(null);

  const orders = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const tabs: { value: Tab; label: string }[] = [
    { value: "all", label: t("admin.common.all") },
    ...STATUS_KEYS.map((s) => ({ value: s, label: t(`after.status.${s}` as const) })),
  ];

  return (
    <Page width="wide">
      <PageHeader icon={Inbox} title={t("nav.admin.orders")} subtitle={t("after.admin.orders.count", { count: total })} />

      <Card flush>
        <IndexToolbar>
          <FilterTabs
            tabs={tabs}
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          />
        </IndexToolbar>

        {isError ? (
          <ErrorState message={t("after.admin.orders.error")} onRetry={() => refetch()} />
        ) : !isLoading && orders.length === 0 ? (
          <EmptyState icon={Inbox} title={t("after.admin.orders.empty")} description={t("admin.orders.emptyHint")} />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>{t("admin.orders.thOrder")}</Th>
                <Th>{t("after.admin.orders.thDate")}</Th>
                <Th>{t("admin.orders.thCustomer")}</Th>
                <Th align="right">{t("after.admin.orders.thTotal")}</Th>
                <Th>{t("after.admin.orders.thStatus")}</Th>
                <Th>{t("after.admin.orders.thAction")}</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows cols={6} />
              ) : (
                orders.map((o) => {
                  const rowPending = updateStatus.isPending && updateStatus.variables?.id === o.id;
                  const current = normalizeOrderStatus(o.status) ?? o.status;
                  return (
                    <Tr key={o.id} href={`/admin/orders/${o.id}`}>
                      <Td className="whitespace-nowrap font-semibold">{o.order_number || o.id.split("-")[0]}</Td>
                      <Td className="whitespace-nowrap text-admin-muted">{fmt.date(o.created_at)}</Td>
                      <Td>
                        <div className="max-w-56 truncate">{o.shipping_address.recipient}</div>
                        <div className="text-xs text-admin-muted">{o.shipping_address.phone}</div>
                      </Td>
                      <Td align="right" className="whitespace-nowrap tabular-nums">
                        {formatRupiah(o.total)}
                      </Td>
                      <Td>
                        <OrderBadge status={o.status} />
                      </Td>
                      <Td className="w-44" onClick={stopRow} onKeyDown={stopRow}>
                        <SelectInput
                          value={current}
                          disabled={rowPending}
                          aria-label={t("after.admin.orders.thAction")}
                          className="[&_select]:h-7 [&_select]:text-xs"
                          onChange={(e) => {
                            const next = e.target.value as OrderStatus;
                            // "Dikirim" butuh kurir & resi: buka form dulu, jangan kirim langsung.
                            if (next === "shipped") setShipOrderId(o.id);
                            else updateStatus.mutate({ id: o.id, status: next });
                          }}
                        >
                          {STATUS_KEYS.map((s) => (
                            <option key={s} value={s}>
                              {t(`after.status.${s}` as const)}
                            </option>
                          ))}
                        </SelectInput>
                      </Td>
                    </Tr>
                  );
                })
              )}
            </tbody>
          </DataTable>
        )}
        <Pager page={page} totalPages={totalPages} onPage={setPage} />
      </Card>

      <ShipOrderModal orderId={shipOrderId} onClose={() => setShipOrderId(null)} />
    </Page>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense>
      <OrdersIndex />
    </Suspense>
  );
}
