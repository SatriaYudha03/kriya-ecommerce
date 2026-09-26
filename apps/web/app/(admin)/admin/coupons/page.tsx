"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Ticket, History } from "lucide-react";
import { useAdminCoupons, useDeleteCoupon } from "@/lib/promo/queries";
import { formatRupiah } from "@/lib/format";
import { CouponForm } from "@/components/kriya/admin/coupon-form";
import Link from "next/link";

const LIMIT = 20;

export default function AdminCouponsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState<{ open: boolean; couponId?: string }>({ open: false });
  
  const { data, isLoading, isError } = useAdminCoupons({ page, limit: LIMIT, search, status });
  const del = useDeleteCoupon();

  const coupons = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  function handleDelete(id: string, code: string) {
    if (confirm(`Hapus kupon "${code}"? Tindakan ini tidak bisa dibatalkan jika belum terpakai.`)) {
      del.mutate(id);
    }
  }

  function getStatusColor(s: string) {
    switch (s) {
      case "active":
        return "bg-green-100 text-green-800";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "expired":
        return "bg-red-100 text-red-800";
      case "inactive":
        return "bg-neutral-100 text-neutral-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Manajemen Kupon</h1>
          <p className="mt-1 text-sm text-neutral-500">{total} kupon</p>
        </div>
        <button
          onClick={() => setForm({ open: true, couponId: undefined })}
          className="flex items-center gap-2 rounded-lg bg-brand-strong px-4 py-2 text-sm font-medium text-white hover:bg-brand"
        >
          <Plus className="h-4 w-4" /> Tambah Kupon
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Cari kode kupon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="scheduled">Terjadwal</option>
          <option value="expired">Kadaluarsa</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Memuat kupon...
          </div>
        ) : isError ? (
          <div className="py-20 text-center text-sm text-red-600">Gagal memuat kupon.</div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-neutral-500">
            <Ticket className="h-8 w-8" />
            <p className="text-sm">Belum ada kupon.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <Th>Kode</Th>
                  <Th>Diskon</Th>
                  <Th>Status</Th>
                  <Th>Pemakaian</Th>
                  <Th className="text-right">Aksi</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {coupons.map((c) => (
                  <tr key={c.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-neutral-900">{c.code}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                      {c.discount_type === "percent"
                        ? `${c.amount}%`
                        : c.discount_type === "fixed_cart"
                        ? formatRupiah(c.amount)
                        : "Gratis Ongkir"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold uppercase tracking-wider ${getStatusColor(
                          c.status
                        )}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                      {c.total_redemptions} {c.usage_limit ? `/ ${c.usage_limit}` : ""}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-3">
                        <Link
                          href={`/admin/coupons/${c.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-900"
                        >
                          <History className="h-4 w-4" /> Riwayat
                        </Link>
                        <button
                          onClick={() => setForm({ open: true, couponId: c.id })}
                          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-strong"
                        >
                          <Pencil className="h-4 w-4" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.code)}
                          disabled={del.isPending && del.variables === c.id}
                          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" /> Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-neutral-300 px-4 py-2 disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <span className="text-neutral-500">
            Halaman {page} dari {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-neutral-300 px-4 py-2 disabled:opacity-40"
          >
            Berikutnya
          </button>
        </div>
      )}

      {form.open && (
        <CouponForm couponId={form.couponId} onClose={() => setForm({ open: false })} />
      )}
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 ${className}`}
    >
      {children}
    </th>
  );
}