"use client";

import { useParams } from "next/navigation";
import { User } from "lucide-react";
import { useAdminCustomerDetail } from "@/lib/customer/queries";
import { formatRupiah } from "@/lib/format";
import { useLanguage } from "@/components/kriya/language-provider";
import { OrderBadge } from "@/components/kriya/admin/status-badges";
import {
  Badge,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  InfoItem,
  InfoList,
  Layout,
  LayoutAside,
  LayoutMain,
  LoadingState,
  Page,
  PageHeader,
  Td,
  Th,
  Tr,
  useAdminFormat,
} from "@/components/kriya/admin/ui";

export default function CustomerDetailPage() {
  const { t } = useLanguage();
  const fmt = useAdminFormat();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useAdminCustomerDetail(id);

  if (isLoading) {
    return (
      <Page>
        <LoadingState />
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <PageHeader
          icon={User}
          backHref="/admin/customers"
          backLabel={t("nav.admin.customers")}
          title={t("adminCustomer.customerDetail.title")}
        />
        <Card>
          <ErrorState message={t("admin.customers.notFound")} onRetry={() => refetch()} />
        </Card>
      </Page>
    );
  }

  const avg = data.orders_count > 0 ? Math.round(data.total_spent / data.orders_count) : 0;

  return (
    <Page>
      <PageHeader
        icon={User}
        backHref="/admin/customers"
        backLabel={t("nav.admin.customers")}
        title={data.full_name || data.email}
        subtitle={t("admin.customers.since", { date: fmt.date(data.created_at) })}
      />

      {/* Ringkasan angka seperti strip statistik pelanggan Shopify */}
      <Card className="mb-4">
        <div className="grid grid-cols-1 divide-y divide-admin-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Stat label={t("adminCustomer.customerDetail.totalSpent")} value={formatRupiah(data.total_spent)} />
          <Stat label={t("adminCustomer.customerDetail.ordersCount")} value={String(data.orders_count)} />
          <Stat label={t("admin.customers.aov")} value={formatRupiah(avg)} />
        </div>
      </Card>

      <Layout>
        <LayoutMain>
          <Card flush title={t("adminCustomer.customerDetail.recentOrders")}>
            {data.recent_orders.length === 0 ? (
              <EmptyState title={t("adminCustomer.customerDetail.noOrders")} />
            ) : (
              <DataTable>
                <thead>
                  <tr>
                    <Th>{t("admin.orders.thOrder")}</Th>
                    <Th>{t("after.admin.orders.thDate")}</Th>
                    <Th>{t("after.admin.orders.thStatus")}</Th>
                    <Th align="right">{t("after.admin.orders.thTotal")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_orders.map((order) => (
                    <Tr key={order.id} href={`/admin/orders/${order.id}`}>
                      <Td className="font-semibold">{order.order_number}</Td>
                      <Td className="text-admin-muted">{fmt.date(order.created_at)}</Td>
                      <Td>
                        <OrderBadge status={order.status} />
                      </Td>
                      <Td align="right" className="tabular-nums">
                        {formatRupiah(order.total)}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </Card>

          <Card title={t("adminCustomer.customerDetail.addresses")}>
            {data.addresses.length === 0 ? (
              <p className="text-admin-muted">{t("adminCustomer.customerDetail.noAddresses")}</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {data.addresses.map((addr) => (
                  <div key={addr.id} className="rounded-xl border border-admin-border p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="font-semibold">{addr.label}</p>
                      {addr.is_default && <Badge tone="info">{t("adminCustomer.customerDetail.defaultBadge")}</Badge>}
                    </div>
                    <p>
                      {addr.recipient} · {addr.phone}
                    </p>
                    <p className="mt-1 text-admin-muted">{addr.address_line}</p>
                    <p className="text-admin-muted">
                      {addr.district ? `${addr.district}, ` : ""}
                      {addr.city}, {addr.province} {addr.postal_code}
                    </p>
                    {addr.notes && (
                      <p className="mt-2 text-xs italic text-admin-muted">
                        {t("adminCustomer.customerDetail.notes")}: {addr.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </LayoutMain>

        <LayoutAside>
          <Card title={t("admin.customers.overview")}>
            <InfoList>
              <InfoItem label={t("adminCustomer.customerDetail.name")}>{data.full_name || "—"}</InfoItem>
              <InfoItem label={t("adminCustomer.customerDetail.email")}>
                <a href={`mailto:${data.email}`} className="text-admin-link hover:underline">
                  {data.email}
                </a>
              </InfoItem>
              <InfoItem label={t("adminCustomer.customerDetail.phone")}>{data.phone || "—"}</InfoItem>
              <InfoItem label={t("adminCustomer.customerDetail.registered")}>{fmt.date(data.created_at)}</InfoItem>
              {data.last_order_at && (
                <InfoItem label={t("admin.customers.lastOrder")}>{fmt.date(data.last_order_at)}</InfoItem>
              )}
            </InfoList>
          </Card>
        </LayoutAside>
      </Layout>
    </Page>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-1 py-2 sm:px-4 sm:first:pl-0">
      <p className="text-xs text-admin-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-admin-text">{value}</p>
    </div>
  );
}
