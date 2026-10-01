"use client";

import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  Clock,
  Package,
  AlertTriangle,
  Star,
  RotateCcw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAdminStats } from "@/lib/admin-queries";
import { formatRupiah } from "@/lib/format";
import { useLanguage } from "@/components/kriya/language-provider";
import { OrderStatusBadge } from "@/components/kriya/aftersales/order-status-badge";
import type { OrderStatus } from "@/lib/aftersales/types";

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  href,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
  href?: string;
}) {
  const Card = (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition-colors hover:border-brand-tint">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-500">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-tint text-brand-strong">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {loading ? (
        <div className="mt-3 h-9 w-28 animate-pulse rounded bg-neutral-100" />
      ) : (
        <p className="mt-2 text-3xl font-semibold text-neutral-900">{value}</p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {Card}
      </Link>
    );
  }
  return Card;
}

export default function AdminDashboard() {
  const { data, isLoading } = useAdminStats();
  const { t, locale } = useLanguage();

  const chartData = [
    { name: t("adminPromo.pendingPayment"), count: data?.pending_payment_count ?? 0 },
    { name: t("adminPromo.toShip"), count: data?.to_ship_count ?? 0 },
    { name: t("adminPromo.lowStock"), count: data?.low_stock_count ?? 0 },
    { name: t("adminPromo.pendingReviews"), count: data?.pending_reviews_count ?? 0 },
    { name: t("adminPromo.openReturns"), count: data?.open_returns_count ?? 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">
        {t("adminPromo.dashboard")}
      </h1>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard
          label={t("adminPromo.todayRevenue")}
          value={formatRupiah(data?.today_revenue ?? 0)}
          icon={DollarSign}
          loading={isLoading}
        />
        <StatCard
          label={t("adminPromo.todayOrders")}
          value={String(data?.today_orders ?? 0)}
          icon={ShoppingCart}
          loading={isLoading}
        />
        <StatCard
          label={t("adminPromo.pendingPayment")}
          value={String(data?.pending_payment_count ?? 0)}
          icon={Clock}
          loading={isLoading}
          href="/admin/orders?status=pending"
        />
        <StatCard
          label={t("adminPromo.toShip")}
          value={String(data?.to_ship_count ?? 0)}
          icon={Package}
          loading={isLoading}
          href="/admin/orders?status=processing"
        />
        <StatCard
          label={t("adminPromo.lowStock")}
          value={String(data?.low_stock_count ?? 0)}
          icon={AlertTriangle}
          loading={isLoading}
          href="/admin/inventory"
        />
        <StatCard
          label={t("adminPromo.pendingReviews")}
          value={String(data?.pending_reviews_count ?? 0)}
          icon={Star}
          loading={isLoading}
          href="/admin/reviews"
        />
        <StatCard
          label={t("adminPromo.openReturns")}
          value={String(data?.open_returns_count ?? 0)}
          icon={RotateCcw}
          loading={isLoading}
          href="/admin/returns"
        />
      </div>

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-medium text-neutral-900 mb-4">
            {t("adminPromo.taskOverview") || "Task Overview"}
          </h2>
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm h-[350px]">
            {isLoading ? (
              <div className="h-full w-full animate-pulse rounded bg-neutral-100" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: "#737373" }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: "#737373" }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    cursor={{ fill: "#f5f5f5" }}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e5e5e5", boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)" }}
                  />
                  <Bar dataKey="count" fill="#000" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-neutral-900">
              {t("adminPromo.recentOrders")}
            </h2>
            <Link
              href="/admin/orders"
              className="text-sm font-medium text-brand-strong hover:underline"
            >
              {t("adminPromo.viewAll")} &rarr;
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500"
                >
                  {t("adminPromo.dashboard.thOrderId")}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500"
                >
                  {t("adminPromo.dashboard.thStatus")}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500"
                >
                  {t("adminPromo.dashboard.thTotal")}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500"
                >
                  {t("adminPromo.dashboard.thEmail")}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500"
                >
                  {t("adminPromo.dashboard.thDate")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center">
                    <div className="h-6 w-full animate-pulse rounded bg-neutral-100" />
                  </td>
                </tr>
              ) : data?.recent_orders && data.recent_orders.length > 0 ? (
                data.recent_orders.map((order) => (
                  <tr key={order.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-neutral-900">
                      {order.order_number}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                      <OrderStatusBadge status={order.status as OrderStatus} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-900">
                      {formatRupiah(order.total)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                      {order.customer_email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-neutral-500">
                      {new Date(order.created_at).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-sm text-neutral-500"
                  >
                    {t("adminPromo.dashboard.emptyOrders")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </div>
  );
}
