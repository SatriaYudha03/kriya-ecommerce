"use client";

import { useState } from "react";
import { Plus, TicketPercent } from "lucide-react";
import { useAdminCoupons } from "@/lib/promo/queries";
import type { Coupon } from "@/lib/promo/types";
import { formatRupiah } from "@/lib/format";
import { useLanguage } from "@/components/kriya/language-provider";
import { CouponStatusBadge } from "@/components/kriya/admin/status-badges";
import {
  ButtonLink,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  FilterTabs,
  IndexToolbar,
  Page,
  PageHeader,
  Pager,
  SearchInput,
  SkeletonRows,
  Td,
  Th,
  Tr,
  useDebounced,
} from "@/components/kriya/admin/ui";

const LIMIT = 20;
type Tab = "" | "active" | "scheduled" | "expired" | "inactive";

export default function AdminCouponsPage() {
  const { t, locale } = useLanguage();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [status, setStatus] = useState<Tab>("");
  const { data, isLoading, isError, refetch } = useAdminCoupons({ page, limit: LIMIT, search: debounced, status });

  const coupons = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const tabs: { value: Tab; label: string }[] = [
    { value: "", label: t("admin.common.all") },
    { value: "active", label: t("adminPromo.coupons.statusActive") },
    { value: "scheduled", label: t("adminPromo.coupons.statusScheduled") },
    { value: "expired", label: t("adminPromo.coupons.statusExpired") },
    { value: "inactive", label: t("adminPromo.coupons.statusInactive") },
  ];

  const valueOf = (c: Coupon) =>
    c.discount_type === "percent"
      ? t("admin.coupons.summaryPercent", { n: c.amount })
      : c.discount_type === "fixed_cart"
        ? t("admin.coupons.summaryFixed", { amount: formatRupiah(c.amount) })
        : t("adminPromo.coupons.freeShipping");

  return (
    <Page width="wide">
      <PageHeader
        icon={TicketPercent}
        title={t("admin.nav.discounts")}
        subtitle={t("adminPromo.coupons.count", { total })}
        actions={
          <ButtonLink href="/admin/coupons/new" variant="primary">
            <Plus /> {t("adminPromo.coupons.add")}
          </ButtonLink>
        }
      />

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
          <SearchInput
            className="sm:ml-auto sm:w-64"
            placeholder={t("adminPromo.coupons.searchPlaceholder")}
            aria-label={t("adminPromo.coupons.searchAria")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </IndexToolbar>

        {isError ? (
          <ErrorState message={t("adminPromo.coupons.error")} onRetry={() => refetch()} />
        ) : !isLoading && coupons.length === 0 ? (
          <EmptyState
            icon={TicketPercent}
            title={t("adminPromo.coupons.empty")}
            description={t("admin.coupons.emptyHint")}
            action={
              <ButtonLink href="/admin/coupons/new" variant="primary">
                <Plus /> {t("adminPromo.coupons.add")}
              </ButtonLink>
            }
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>{t("admin.coupons.thTitle")}</Th>
                <Th>{t("adminPromo.coupons.thStatus")}</Th>
                <Th>{t("adminPromo.coupons.thDiscount")}</Th>
                <Th align="right">{t("adminPromo.coupons.thUsage")}</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows cols={4} />
              ) : (
                coupons.map((c) => (
                  <Tr key={c.id} href={`/admin/coupons/${c.id}`}>
                    <Td>
                      <p className="font-mono font-semibold">{c.code}</p>
                      <p className="max-w-md truncate text-xs text-admin-muted">
                        {c.description_i18n[locale] || c.description_i18n.id}
                      </p>
                    </Td>
                    <Td>
                      <CouponStatusBadge status={c.status} />
                    </Td>
                    <Td className="whitespace-nowrap">{valueOf(c)}</Td>
                    <Td align="right" className="whitespace-nowrap tabular-nums text-admin-muted">
                      {c.total_redemptions}
                      {c.usage_limit ? ` / ${c.usage_limit}` : ""}
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </DataTable>
        )}
        <Pager page={page} totalPages={totalPages} onPage={setPage} />
      </Card>
    </Page>
  );
}
