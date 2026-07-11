"use client";

import { ShoppingCart, Wallet, Package } from "lucide-react";
import { useAdminStats } from "@/lib/admin-queries";
import { formatRupiah } from "@/lib/format";

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
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
}

export default function AdminDashboard() {
  const { data, isLoading } = useAdminStats();

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
      <p className="mt-1 text-sm text-neutral-500">Ringkasan aktivitas toko KRIYA.</p>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Pesanan"
          value={String(data?.total_orders ?? 0)}
          icon={ShoppingCart}
          loading={isLoading}
        />
        <StatCard
          label="Pendapatan"
          value={formatRupiah(data?.revenue ?? 0)}
          icon={Wallet}
          loading={isLoading}
        />
        <StatCard
          label="Produk Aktif"
          value={String(data?.active_products ?? 0)}
          icon={Package}
          loading={isLoading}
        />
      </div>

      <p className="mt-4 text-xs text-neutral-400">
        Pendapatan dihitung dari pesanan berstatus dibayar, diproses, dikirim, atau selesai.
      </p>
    </div>
  );
}
