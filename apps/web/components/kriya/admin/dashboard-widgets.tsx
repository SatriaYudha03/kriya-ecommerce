"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";

// Palet kategorikal dashboard (urutan tetap, divalidasi CVD terhadap
// permukaan putih). Slot 1 = aksen terracotta brand.
export const SERIES_COLORS = ["#c2673f", "#2a78d6", "#1baf7a", "#eda100", "#4a3aa7", "#e87ba4"] as const;
export const NEUTRAL_SERIES = "#a8a29e";

const AXIS_TICK = { fontSize: 12, fill: "#78716c" };

export function compactRupiah(value: number, locale: string): string {
  return (
    "Rp" +
    new Intl.NumberFormat(locale === "en" ? "en-US" : "id-ID", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value)
  );
}

export function Panel({
  title,
  subtitle,
  action,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex flex-col rounded-2xl border border-stone-200 bg-white p-6", className)}>
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-stone-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-stone-500">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}

export function PanelMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-40 items-center justify-center text-center text-sm text-stone-400">
      {children}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-stone-100", className)} />;
}

export function KpiCard({
  label,
  value,
  hint,
  delta,
  deltaLabel,
  noPrevLabel,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string;
  hint: string;
  delta: number | null;
  deltaLabel: string;
  noPrevLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
}) {
  const up = delta !== null && delta > 0.0005;
  const down = delta !== null && delta < -0.0005;
  const DeltaIcon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-stone-500">{label}</p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand-strong">
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-2 h-8 w-32" />
          <Skeleton className="mt-3 h-4 w-40" />
        </>
      ) : (
        <>
          <p className="mt-1 truncate text-[28px] font-semibold leading-tight tracking-tight text-stone-900 tabular-nums">
            {value}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {delta === null ? (
              <span className="text-stone-400">{noPrevLabel}</span>
            ) : (
              <>
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold tabular-nums",
                    up && "bg-emerald-50 text-emerald-700",
                    down && "bg-red-50 text-red-700",
                    !up && !down && "bg-stone-100 text-stone-600",
                  )}
                >
                  <DeltaIcon className="h-3 w-3" />
                  {Math.abs(delta * 100).toFixed(Math.abs(delta) < 0.1 ? 1 : 0)}%
                </span>
                <span className="text-stone-400">{deltaLabel}</span>
              </>
            )}
          </div>
          <p className="mt-1.5 text-xs text-stone-400">{hint}</p>
        </>
      )}
    </div>
  );
}

export interface TrendPoint {
  key: string;
  label: string;
  net_sales: number;
  orders_count: number;
}

export function SalesTrendChart({
  data,
  locale,
  ordersLabel,
}: {
  data: TrendPoint[];
  locale: string;
  ordersLabel: string;
}) {
  const byKey = new Map(data.map((d) => [d.label, d]));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#f0eeec" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={AXIS_TICK}
          minTickGap={24}
          tickMargin={8}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={AXIS_TICK}
          width={64}
          tickFormatter={(v: number) => compactRupiah(v, locale)}
        />
        <Tooltip
          cursor={{ fill: "#f5f5f4" }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #e7e5e4",
            boxShadow: "0 4px 16px rgb(0 0 0 / 0.06)",
            fontSize: 13,
          }}
          labelStyle={{ color: "#1c1917", fontWeight: 600, marginBottom: 4 }}
          formatter={(value, _name, item) => {
            const orders = byKey.get(String(item.payload?.label ?? ""))?.orders_count ?? 0;
            return [`${formatRupiah(Number(value))} · ${orders} ${ordersLabel}`, ""];
          }}
          separator=""
        />
        <Bar dataKey="net_sales" fill={SERIES_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
  display: string;
}

export function DonutWithLegend({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: DonutSlice[];
  centerLabel: string;
  centerValue: string;
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius="68%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="#ffffff"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((s) => (
                <Cell key={s.key} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 13 }}
              formatter={(_value, _name, item) => {
                const slice = slices.find((s) => s.key === item.payload?.key);
                return [slice?.display ?? "", slice?.label ?? ""];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] uppercase tracking-wide text-stone-400">{centerLabel}</span>
          <span className="max-w-[6.5rem] truncate text-lg font-semibold text-stone-900 tabular-nums">
            {centerValue}
          </span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2.5">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="min-w-0 flex-1 truncate text-stone-600">{s.label}</span>
            <span className="font-medium text-stone-900 tabular-nums">{s.display}</span>
            <span className="w-10 text-right text-xs text-stone-400 tabular-nums">
              {total > 0 ? Math.round((s.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AttentionRow({
  href,
  label,
  count,
  icon: Icon,
  loading,
}: {
  href: string;
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
}) {
  const active = count > 0;
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-stone-50"
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          active ? "bg-brand-tint text-brand-strong" : "bg-stone-100 text-stone-400",
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className={cn("flex-1 text-sm", active ? "font-medium text-stone-800" : "text-stone-500")}>
        {label}
      </span>
      {loading ? (
        <Skeleton className="h-5 w-8" />
      ) : (
        <span
          className={cn(
            "min-w-8 rounded-full px-2 py-0.5 text-center text-sm font-semibold tabular-nums",
            active ? "bg-stone-900 text-white" : "text-stone-400",
          )}
        >
          {count}
        </span>
      )}
      <ChevronRight className="h-4 w-4 text-stone-300 transition-colors group-hover:text-stone-500" />
    </Link>
  );
}
