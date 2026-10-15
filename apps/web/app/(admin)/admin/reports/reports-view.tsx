"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BarChart3, Download } from "lucide-react";
import { getReportSummary, getReportSales, getReportTopProducts } from "@/lib/promo/api";
import { formatRupiah } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/kriya/language-provider";
import { SalesTrendChart, type TrendPoint } from "@/components/kriya/admin/dashboard-widgets";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Page,
  PageHeader,
  SelectInput,
  Skeleton,
  Td,
  TextInput,
  Th,
  Tr,
} from "@/components/kriya/admin/ui";

type Interval = "day" | "week" | "month";

function isoDay(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function ReportsView() {
  const { t, locale } = useLanguage();
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return isoDay(d);
  });
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [interval, setInterval] = useState<Interval>("day");
  const [downloading, setDownloading] = useState(false);

  const summaryQ = useQuery({ queryKey: ["reportSummary", from, to], queryFn: () => getReportSummary(from, to) });
  const salesQ = useQuery({
    queryKey: ["reportSales", from, to, interval],
    queryFn: () => getReportSales(from, to, interval),
  });
  const topQ = useQuery({ queryKey: ["reportTopProducts", from, to], queryFn: () => getReportTopProducts(from, to, 10) });

  const summary = summaryQ.data;
  const sales = useMemo(() => salesQ.data ?? [], [salesQ.data]);
  const topProducts = topQ.data ?? [];
  const tag = locale === "en" ? "en-US" : "id-ID";

  const trend = useMemo<TrendPoint[]>(() => {
    const fmt = new Intl.DateTimeFormat(
      tag,
      interval === "month" ? { month: "short", year: "2-digit" } : { day: "numeric", month: "short" },
    );
    return sales.map((s) => ({
      key: s.period,
      label: fmt.format(new Date(s.period)),
      net_sales: s.net_sales,
      orders_count: s.orders_count,
    }));
  }, [sales, interval, tag]);

  const downloadCsv = async () => {
    setDownloading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const params = new URLSearchParams({ from, to, interval, format: "csv" });
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + `/api/v1/admin/reports/sales?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(t("admin.reports.csvFailed"));
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales_report_${from}_to_${to}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("admin.reports.csvFailed"));
    } finally {
      setDownloading(false);
    }
  };

  const metrics: { label: string; value: string }[] = summary
    ? [
        { label: t("adminPromo.reports.grossSales"), value: formatRupiah(summary.gross_sales) },
        { label: t("adminPromo.reports.discountTotal"), value: formatRupiah(summary.discount_total) },
        { label: t("adminPromo.reports.refundTotal"), value: formatRupiah(summary.refunded_total) },
        { label: t("adminPromo.reports.netSales"), value: formatRupiah(summary.net_sales) },
        { label: t("adminPromo.reports.ordersCount"), value: String(summary.orders_count) },
        { label: t("adminPromo.reports.itemsSold"), value: String(summary.items_sold) },
        { label: t("adminPromo.reports.avgOrderValue"), value: formatRupiah(summary.avg_order_value) },
        { label: t("adminPromo.reports.newCustomers"), value: String(summary.new_customers) },
      ]
    : [];

  return (
    <Page width="full">
      <PageHeader
        icon={BarChart3}
        title={t("adminPromo.reports.title")}
        subtitle={t("admin.reports.subtitle")}
        actions={
          <Button onClick={downloadCsv} loading={downloading} disabled={!sales.length}>
            <Download /> {t("adminPromo.reports.downloadCsv")}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <TextInput
          type="date"
          aria-label={t("adminPromo.reports.from")}
          value={from}
          max={to}
          onChange={(e) => setFrom(e.target.value)}
          className="h-8 w-40 bg-white"
        />
        <span className="pb-1.5 text-admin-muted">–</span>
        <TextInput
          type="date"
          aria-label={t("adminPromo.reports.to")}
          value={to}
          min={from}
          onChange={(e) => setTo(e.target.value)}
          className="h-8 w-40 bg-white"
        />
        <SelectInput
          aria-label={t("admin.reports.interval")}
          className="w-36 [&_select]:h-8"
          value={interval}
          onChange={(e) => setInterval(e.target.value as Interval)}
        >
          <option value="day">{t("adminPromo.reports.intervalDay")}</option>
          <option value="week">{t("adminPromo.reports.intervalWeek")}</option>
          <option value="month">{t("adminPromo.reports.intervalMonth")}</option>
        </SelectInput>
      </div>

      {summaryQ.isError || salesQ.isError || topQ.isError ? (
        <Card>
          <ErrorState
            message={t("adminPromo.reports.error")}
            onRetry={() => {
              summaryQ.refetch();
              salesQ.refetch();
              topQ.refetch();
            }}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <Card flush>
            <div className="grid grid-cols-2 gap-px bg-admin-border lg:grid-cols-4">
              {(summaryQ.isLoading ? Array.from({ length: 8 }, () => null) : metrics).map((m, i) => (
                <div key={i} className="bg-white p-4">
                  {m ? (
                    <>
                      <p className="text-xs text-admin-muted">{m.label}</p>
                      <p className="mt-1 truncate text-lg font-semibold tabular-nums">{m.value}</p>
                    </>
                  ) : (
                    <>
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="mt-2 h-6 w-32" />
                    </>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card title={t("adminPromo.reports.netSalesChart")}>
            <div className="h-72">
              {salesQ.isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : trend.length === 0 ? (
                <EmptyState icon={BarChart3} title={t("adminPromo.reports.chartEmpty")} />
              ) : (
                <SalesTrendChart data={trend} locale={locale} ordersLabel={t("adminPromo.dash.ordersUnit")} />
              )}
            </div>
          </Card>

          <Card flush title={t("adminPromo.reports.topProducts")}>
            {!topQ.isLoading && topProducts.length === 0 ? (
              <EmptyState title={t("adminPromo.reports.topEmpty")} />
            ) : (
              <DataTable>
                <thead>
                  <tr>
                    <Th className="w-10">#</Th>
                    <Th>{t("adminPromo.reports.thProduct")}</Th>
                    <Th align="right">{t("adminPromo.reports.thSold")}</Th>
                    <Th align="right">{t("adminPromo.reports.thRevenue")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <Tr key={p.product_id} href={`/admin/products/${p.product_id}`}>
                      <Td className="tabular-nums text-admin-muted">{i + 1}</Td>
                      <Td className="font-semibold">{p.name}</Td>
                      <Td align="right" className="tabular-nums">
                        {p.items_sold}
                      </Td>
                      <Td align="right" className="tabular-nums">
                        {formatRupiah(p.revenue)}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </Card>
        </div>
      )}
    </Page>
  );
}
