"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getReportSummary, getReportSales, getReportTopProducts } from "@/lib/promo/api";
import { formatRupiah } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/kriya/language-provider";
import { Loader2 } from "lucide-react";

export default function ReportsView() {
  const { t, locale } = useLanguage();
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [interval, setInterval] = useState("day");

  const { data: summary, isLoading: loadingSummary, isError: errorSummary } = useQuery({
    queryKey: ["reportSummary", from, to],
    queryFn: () => getReportSummary(from, to),
  });

  const { data: sales = [], isLoading: loadingSales, isError: errorSales } = useQuery({
    queryKey: ["reportSales", from, to, interval],
    queryFn: () => getReportSales(from, to, interval),
  });

  const { data: topProducts = [], isLoading: loadingTop, isError: errorTop } = useQuery({
    queryKey: ["reportTopProducts", from, to],
    queryFn: () => getReportTopProducts(from, to, 10),
  });

  const loading = loadingSummary || loadingSales || loadingTop;
  const isError = errorSummary || errorSales || errorTop;

  const downloadCsv = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      
      const params = new URLSearchParams({ from, to, interval, format: "csv" });
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + `/api/v1/admin/reports/sales?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to download csv");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales_report_${from}_to_${to}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  // SVG Chart Calculation
  const chartHeight = 300;
  const chartWidth = 800;
  const maxSale = useMemo(() => {
    if (!sales.length) return 0;
    return Math.max(...sales.map((s) => s.net_sales));
  }, [sales]);

  const dateLocale = locale === "en" ? "en-US" : "id-ID";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-semibold">{t("adminPromo.reports.title")}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Input 
            type="date" 
            aria-label={t("adminPromo.reports.from")}
            value={from} 
            onChange={(e) => setFrom(e.target.value)} 
            className="w-40" 
          />
          <span className="text-muted-foreground">-</span>
          <Input 
            type="date" 
            aria-label={t("adminPromo.reports.to")}
            value={to} 
            onChange={(e) => setTo(e.target.value)} 
            className="w-40" 
          />
          <Select value={interval} onValueChange={(val) => val && setInterval(val)}>
            <SelectTrigger className="w-32" aria-label="Interval">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">{t("adminPromo.reports.intervalDay")}</SelectItem>
              <SelectItem value="week">{t("adminPromo.reports.intervalWeek")}</SelectItem>
              <SelectItem value="month">{t("adminPromo.reports.intervalMonth")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={downloadCsv} disabled={loading || !sales.length}>
            {t("adminPromo.reports.downloadCsv")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-12">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("adminPromo.reports.loading")}
        </div>
      ) : isError ? (
        <div role="alert" className="text-sm text-destructive py-12 text-center">
          {t("adminPromo.reports.error")}
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">{t("adminPromo.reports.grossSales")}</div>
              <div className="text-xl font-semibold">{formatRupiah(summary.gross_sales)}</div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">{t("adminPromo.reports.discountTotal")}</div>
              <div className="text-xl font-semibold">{formatRupiah(summary.discount_total)}</div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">{t("adminPromo.reports.refundTotal")}</div>
              <div className="text-xl font-semibold">{formatRupiah(summary.refunded_total)}</div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">{t("adminPromo.reports.netSales")}</div>
              <div className="text-xl font-semibold">{formatRupiah(summary.net_sales)}</div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">{t("adminPromo.reports.ordersCount")}</div>
              <div className="text-xl font-semibold">{summary.orders_count}</div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">{t("adminPromo.reports.itemsSold")}</div>
              <div className="text-xl font-semibold">{summary.items_sold}</div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">{t("adminPromo.reports.avgOrderValue")}</div>
              <div className="text-xl font-semibold">{formatRupiah(summary.avg_order_value)}</div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">{t("adminPromo.reports.newCustomers")}</div>
              <div className="text-xl font-semibold">{summary.new_customers}</div>
            </div>
          </div>

          <div className="border rounded-lg p-4 overflow-x-auto">
            <h2 className="text-lg font-medium mb-4">{t("adminPromo.reports.netSalesChart")}</h2>
            {sales.length > 0 ? (
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full min-w-[600px] h-64 border-b border-l text-xs">
                {sales.map((s, i) => {
                  const barWidth = (chartWidth / sales.length) - 4;
                  const barHeight = maxSale > 0 ? (s.net_sales / maxSale) * (chartHeight - 40) : 0;
                  const x = i * (chartWidth / sales.length) + 2;
                  const y = chartHeight - 20 - barHeight;
                  return (
                    <g key={s.period}>
                      <rect
                        x={x}
                        y={y}
                        width={Math.max(barWidth, 4)}
                        height={barHeight}
                        fill="currentColor"
                        className="text-primary hover:opacity-80 transition-opacity"
                      />
                      <title>{`${s.period}: ${formatRupiah(s.net_sales)}`}</title>
                      {sales.length <= 15 || i % Math.ceil(sales.length / 10) === 0 ? (
                        <text
                          x={x + barWidth / 2}
                          y={chartHeight - 4}
                          textAnchor="middle"
                          fill="currentColor"
                          className="text-muted-foreground"
                        >
                          {interval === "month"
                            ? new Intl.DateTimeFormat(dateLocale, { month: "short", year: "2-digit" }).format(new Date(s.period))
                            : new Intl.DateTimeFormat(dateLocale, { day: "2-digit", month: "2-digit" }).format(new Date(s.period))}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="text-muted-foreground text-sm py-10 text-center">{t("adminPromo.reports.chartEmpty")}</div>
            )}
          </div>

          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-medium mb-4">{t("adminPromo.reports.topProducts")}</h2>
            {topProducts.length > 0 ? (
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="py-2 px-3 font-medium">{t("adminPromo.reports.thProduct")}</th>
                    <th className="py-2 px-3 font-medium text-right">{t("adminPromo.reports.thSold")}</th>
                    <th className="py-2 px-3 font-medium text-right">{t("adminPromo.reports.thRevenue")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {topProducts.map((p) => (
                    <tr key={p.product_id} className="hover:bg-muted/20">
                      <td className="py-2 px-3">{p.name}</td>
                      <td className="py-2 px-3 text-right">{p.items_sold}</td>
                      <td className="py-2 px-3 text-right">{formatRupiah(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-muted-foreground text-sm py-4">{t("adminPromo.reports.topEmpty")}</div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
