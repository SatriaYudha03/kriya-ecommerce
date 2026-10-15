"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Clock,
  House,
  Package,
  ReceiptText,
  RotateCcw,
  ShoppingBag,
  Star,
  UserPlus,
  Wallet,
} from "lucide-react";
import { useAdminStats } from "@/lib/admin-queries";
import {
  useReportBreakdown,
  useReportSales,
  useReportSummary,
  useReportTopProducts,
} from "@/lib/promo/queries";
import { useCategories } from "@/lib/catalog/queries";
import type { ReportSalesItem } from "@/lib/promo/types";
import type { MessageKey } from "@/lib/i18n";
import { formatRupiah } from "@/lib/format";
import { useLanguage } from "@/components/kriya/language-provider";
import { OrderBadge } from "@/components/kriya/admin/status-badges";
import { Badge, Card, DataTable, Page, PageHeader, Segmented, SkeletonRows, Td, TextLink, Th, Tr } from "@/components/kriya/admin/ui";
import {
  AttentionRow,
  DonutWithLegend,
  KpiCard,
  NEUTRAL_SERIES,
  Panel,
  PanelMessage,
  SERIES_COLORS,
  SalesTrendChart,
  Skeleton,
  compactRupiah,
  type DonutSlice,
  type TrendPoint,
} from "@/components/kriya/admin/dashboard-widgets";

type RangeDays = 7 | 30 | 90;
const RANGES: { days: RangeDays; key: MessageKey }[] = [
  { days: 7, key: "adminPromo.dash.range7" },
  { days: 30, key: "adminPromo.dash.range30" },
  { days: 90, key: "adminPromo.dash.range90" },
];

// Warna per status pesanan — melekat ke entitas, tidak ikut urutan jumlah.
const STATUS_ORDER = ["pending_payment", "paid", "processing", "shipped", "completed"] as const;
const STATUS_COLOR: Record<(typeof STATUS_ORDER)[number], string> = {
  pending_payment: SERIES_COLORS[3],
  paid: SERIES_COLORS[0],
  processing: SERIES_COLORS[1],
  shipped: SERIES_COLORS[4],
  completed: SERIES_COLORS[2],
};

const MAX_CATEGORY_SLICES = 5;

function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function periodBounds(days: RangeDays) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = addDays(today, -(days - 1));
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(days - 1));
  return { from, to: today, prevFrom, prevTo };
}

function delta(current: number | undefined, previous: number | undefined): number | null {
  if (current === undefined || previous === undefined || previous === 0) return null;
  return (current - previous) / previous;
}

// API hanya mengembalikan periode yang punya penjualan; isi celah dengan nol
// agar sumbu waktu tidak melompat.
function fillSeries(
  items: ReportSalesItem[],
  from: Date,
  to: Date,
  interval: "day" | "week",
  locale: string,
): TrendPoint[] {
  const byPeriod = new Map(items.map((i) => [i.period, i]));
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short" });
  const start = new Date(from);
  if (interval === "week") {
    // date_trunc('week') di Postgres = Senin.
    const dow = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dow);
  }
  const step = interval === "week" ? 7 : 1;
  const out: TrendPoint[] = [];
  for (let d = start; d <= to; d = addDays(d, step)) {
    const key = ymd(d);
    const item = byPeriod.get(key);
    out.push({
      key,
      label: fmt.format(d),
      net_sales: item?.net_sales ?? 0,
      orders_count: item?.orders_count ?? 0,
    });
  }
  return out;
}

export default function AdminDashboard() {
  const { t, locale } = useLanguage();
  const [range, setRange] = useState<RangeDays>(30);

  const bounds = useMemo(() => periodBounds(range), [range]);
  const from = ymd(bounds.from);
  const to = ymd(bounds.to);
  const interval = range === 90 ? "week" : "day";

  const stats = useAdminStats();
  const summary = useReportSummary(from, to);
  const prevSummary = useReportSummary(ymd(bounds.prevFrom), ymd(bounds.prevTo));
  const sales = useReportSales(from, to, interval);
  const breakdown = useReportBreakdown(from, to);
  const topProducts = useReportTopProducts(from, to, 5);
  const categories = useCategories();

  const trend = useMemo(
    () => (sales.data ? fillSeries(sales.data, bounds.from, bounds.to, interval, locale) : []),
    [sales.data, bounds, interval, locale],
  );

  const statusSlices = useMemo<DonutSlice[]>(() => {
    const rows = breakdown.data?.order_status ?? [];
    const counts = new Map(rows.map((r) => [r.status, r.count]));
    const slices: DonutSlice[] = STATUS_ORDER.filter((s) => (counts.get(s) ?? 0) > 0).map((s) => ({
      key: s,
      label: t(`after.status.${s}` as MessageKey),
      value: counts.get(s) ?? 0,
      color: STATUS_COLOR[s],
      display: String(counts.get(s) ?? 0),
    }));
    const known = new Set<string>(STATUS_ORDER);
    const closed = rows.filter((r) => !known.has(r.status)).reduce((sum, r) => sum + r.count, 0);
    if (closed > 0) {
      slices.push({
        key: "closed",
        label: t("adminPromo.dash.closed"),
        value: closed,
        color: NEUTRAL_SERIES,
        display: String(closed),
      });
    }
    return slices;
  }, [breakdown.data, t]);

  const categorySlices = useMemo<DonutSlice[]>(() => {
    const rows = breakdown.data?.categories ?? [];
    // Warna dikunci ke urutan kategori induk di katalog, bukan ke peringkat.
    const roots = (categories.data ?? [])
      .filter((c) => !c.parent_id)
      .sort((a, b) => a.position - b.position)
      .map((c) => c.slug);
    const colorFor = (slug: string): string => {
      const i = roots.indexOf(slug);
      return i >= 0 && i < SERIES_COLORS.length ? SERIES_COLORS[i] : NEUTRAL_SERIES;
    };
    const top = rows.slice(0, MAX_CATEGORY_SLICES);
    const rest = rows.slice(MAX_CATEGORY_SLICES);
    const slices: DonutSlice[] = top.map((r) => ({
      key: r.slug,
      label: r.name_i18n?.[locale] || r.name_i18n?.id || r.slug,
      value: r.revenue,
      color: colorFor(r.slug),
      display: compactRupiah(r.revenue, locale),
    }));
    const restTotal = rest.reduce((sum, r) => sum + r.revenue, 0);
    if (restTotal > 0) {
      slices.push({
        key: "other",
        label: t("adminPromo.dash.other"),
        value: restTotal,
        color: NEUTRAL_SERIES,
        display: compactRupiah(restTotal, locale),
      });
    }
    return slices;
  }, [breakdown.data, categories.data, locale, t]);

  const s = summary.data;
  const p = prevSummary.data;
  const kpiLoading = summary.isLoading;
  const statusTotal = statusSlices.reduce((sum, x) => sum + x.value, 0);
  const categoryTotal = categorySlices.reduce((sum, x) => sum + x.value, 0);
  const maxSold = Math.max(1, ...(topProducts.data ?? []).map((x) => x.items_sold));
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const attention = [
    { href: "/admin/orders?status=processing", key: "adminPromo.toShip", count: stats.data?.to_ship_count, icon: Package, loading: stats.isLoading },
    { href: "/admin/orders?status=pending_payment", key: "adminPromo.pendingPayment", count: stats.data?.pending_payment_count, icon: Clock, loading: stats.isLoading },
    { href: "/admin/inventory", key: "adminPromo.lowStock", count: stats.data?.low_stock_count, icon: AlertTriangle, loading: stats.isLoading },
    { href: "/admin/reviews", key: "adminPromo.pendingReviews", count: stats.data?.pending_reviews_count, icon: Star, loading: stats.isLoading },
    { href: "/admin/returns", key: "adminPromo.openReturns", count: stats.data?.open_returns_count, icon: RotateCcw, loading: stats.isLoading },
  ] as const;
  const attentionTotal = attention.reduce((sum, a) => sum + (a.count ?? 0), 0);

  return (
    <Page width="full" className="space-y-4">
      <PageHeader
        icon={House}
        title={t("admin.nav.home")}
        subtitle={`${t("adminPromo.dash.subtitle")} · ${dateFmt.format(bounds.from)} – ${dateFmt.format(bounds.to)}`}
        actions={
          <>
            <div className="flex h-8 items-center gap-2 rounded-lg bg-white px-3 shadow-[inset_0_-1px_0_0_#b5b5b5,inset_0_0_0_1px_rgba(0,0,0,0.12)]">
              <span className="h-2 w-2 rounded-full bg-[#29845a]" />
              <span className="text-admin-muted">{t("adminPromo.dash.today")}</span>
              {stats.isLoading ? (
                <Skeleton className="h-4 w-28" />
              ) : (
                <span className="font-semibold text-admin-text tabular-nums">
                  {formatRupiah(stats.data?.today_revenue ?? 0)}
                  <span className="font-normal text-admin-faint">
                    {" "}
                    · {stats.data?.today_orders ?? 0} {t("adminPromo.dash.ordersUnit")}
                  </span>
                </span>
              )}
            </div>
            <Segmented
              label={t("adminPromo.dash.period")}
              value={range}
              onChange={setRange}
              options={RANGES.map((r) => ({ value: r.days, label: t(r.key) }))}
            />
          </>
        }
      />

      {/* KPI periode, dengan pembanding periode sebelumnya */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t("adminPromo.dash.netSales")}
          value={formatRupiah(s?.net_sales ?? 0)}
          hint={t("adminPromo.dash.netSalesHint")}
          delta={delta(s?.net_sales, p?.net_sales)}
          deltaLabel={t("adminPromo.dash.vsPrev")}
          noPrevLabel={t("adminPromo.dash.noPrev")}
          icon={Wallet}
          loading={kpiLoading}
        />
        <KpiCard
          label={t("adminPromo.dash.ordersCount")}
          value={String(s?.orders_count ?? 0)}
          hint={t("adminPromo.dash.ordersHint", { items: s?.items_sold ?? 0 })}
          delta={delta(s?.orders_count, p?.orders_count)}
          deltaLabel={t("adminPromo.dash.vsPrev")}
          noPrevLabel={t("adminPromo.dash.noPrev")}
          icon={ShoppingBag}
          loading={kpiLoading}
        />
        <KpiCard
          label={t("adminPromo.dash.aov")}
          value={formatRupiah(s?.avg_order_value ?? 0)}
          hint={t("adminPromo.dash.aovHint")}
          delta={delta(s?.avg_order_value, p?.avg_order_value)}
          deltaLabel={t("adminPromo.dash.vsPrev")}
          noPrevLabel={t("adminPromo.dash.noPrev")}
          icon={ReceiptText}
          loading={kpiLoading}
        />
        <KpiCard
          label={t("adminPromo.dash.newCustomers")}
          value={String(s?.new_customers ?? 0)}
          hint={t("adminPromo.dash.newCustomersHint")}
          delta={delta(s?.new_customers, p?.new_customers)}
          deltaLabel={t("adminPromo.dash.vsPrev")}
          noPrevLabel={t("adminPromo.dash.noPrev")}
          icon={UserPlus}
          loading={kpiLoading}
        />
      </div>

      {/* Tren penjualan + antrean kerja */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title={t("adminPromo.dash.salesTrend")}
          subtitle={t("adminPromo.dash.salesTrendHint", {
            unit: t(interval === "week" ? "adminPromo.dash.unitWeek" : "adminPromo.dash.unitDay"),
          })}
        >
          <div className="h-72">
            {sales.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : sales.isError ? (
              <PanelMessage>{t("adminPromo.dash.loadError")}</PanelMessage>
            ) : (
              <SalesTrendChart data={trend} locale={locale} ordersLabel={t("adminPromo.dash.ordersUnit")} />
            )}
          </div>
        </Panel>

        <Panel
          title={t("adminPromo.dash.attention")}
          subtitle={t("adminPromo.dash.attentionHint")}
          action={
            !stats.isLoading && attentionTotal === 0 ? (
              <Badge tone="success">{t("adminPromo.dash.allClear")}</Badge>
            ) : undefined
          }
        >
          <div className="-mx-3 -my-1">
            {attention.map((a) => (
              <AttentionRow
                key={a.href}
                href={a.href}
                label={t(a.key)}
                count={a.count ?? 0}
                icon={a.icon}
                loading={a.loading}
              />
            ))}
          </div>
        </Panel>
      </div>

      {/* Komposisi: status pesanan, kategori, produk terlaris */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title={t("adminPromo.dash.orderStatus")} subtitle={t("adminPromo.dash.orderStatusHint")}>
          {breakdown.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : statusSlices.length === 0 ? (
            <PanelMessage>{t("adminPromo.dash.noData")}</PanelMessage>
          ) : (
            <DonutWithLegend
              slices={statusSlices}
              centerLabel={t("adminPromo.dash.orders")}
              centerValue={String(statusTotal)}
            />
          )}
        </Panel>

        <Panel title={t("adminPromo.dash.categoryShare")} subtitle={t("adminPromo.dash.categoryShareHint")}>
          {breakdown.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : categorySlices.length === 0 ? (
            <PanelMessage>{t("adminPromo.dash.noData")}</PanelMessage>
          ) : (
            <DonutWithLegend
              slices={categorySlices}
              centerLabel={t("adminPromo.dash.total")}
              centerValue={compactRupiah(categoryTotal, locale)}
            />
          )}
        </Panel>

        <Panel
          className="lg:col-span-2 xl:col-span-1"
          title={t("adminPromo.dash.topProducts")}
          subtitle={t("adminPromo.dash.topProductsHint")}
        >
          {topProducts.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : !topProducts.data || topProducts.data.length === 0 ? (
            <PanelMessage>{t("adminPromo.dash.noData")}</PanelMessage>
          ) : (
            <ol className="space-y-4">
              {topProducts.data.map((prod, i) => (
                <li key={prod.product_id} className="flex items-center gap-3">
                  <span className="w-4 text-sm font-semibold text-[#b5b5b5] tabular-nums">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-medium text-admin-text">{prod.name}</span>
                      <span className="shrink-0 text-sm font-medium text-admin-text tabular-nums">
                        {compactRupiah(prod.revenue, locale)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-admin-hover">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${(prod.items_sold / maxSold) * 100}%` }}
                        />
                      </div>
                      <span className="w-16 shrink-0 text-right text-xs text-admin-faint tabular-nums">
                        {t("adminPromo.dash.sold", { n: prod.items_sold })}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      {/* Pesanan terbaru */}
      <Card
        flush
        title={t("adminPromo.dash.recentOrders")}
        action={<TextLink href="/admin/orders">{t("adminPromo.viewAll")}</TextLink>}
      >
        <DataTable>
          <thead>
            <tr>
              <Th>{t("adminPromo.dashboard.thOrderId")}</Th>
              <Th>{t("adminPromo.dashboard.thEmail")}</Th>
              <Th>{t("adminPromo.dashboard.thStatus")}</Th>
              <Th align="right">{t("adminPromo.dashboard.thTotal")}</Th>
              <Th align="right">{t("adminPromo.dashboard.thDate")}</Th>
            </tr>
          </thead>
          <tbody>
            {stats.isLoading ? (
              <SkeletonRows cols={5} rows={4} />
            ) : stats.data?.recent_orders && stats.data.recent_orders.length > 0 ? (
              stats.data.recent_orders.map((order) => (
                <Tr key={order.id} href={`/admin/orders/${order.id}`}>
                  <Td className="whitespace-nowrap font-semibold">{order.order_number}</Td>
                  <Td className="max-w-56 truncate text-admin-muted">{order.customer_email || "—"}</Td>
                  <Td className="whitespace-nowrap">
                    <OrderBadge status={order.status} />
                  </Td>
                  <Td align="right" className="whitespace-nowrap tabular-nums">
                    {formatRupiah(order.total)}
                  </Td>
                  <Td align="right" className="whitespace-nowrap text-admin-muted">
                    {dateFmt.format(new Date(order.created_at))}
                  </Td>
                </Tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-admin-muted">
                  {t("adminPromo.dashboard.emptyOrders")}
                </td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </Card>
    </Page>
  );
}
