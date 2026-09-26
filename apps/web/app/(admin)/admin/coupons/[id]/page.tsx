"use client";

import { useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import { useAdminCoupon, useAdminCouponRedemptions } from "@/lib/promo/queries";
import { formatRupiah } from "@/lib/format";
import Link from "next/link";
import { useParams } from "next/navigation";

const LIMIT = 20;

export default function AdminCouponRedemptionsPage() {
  const params = useParams();
  const id = params.id as string;
  const [page, setPage] = useState(1);
  
  const { data: coupon, isLoading: loadingCoupon } = useAdminCoupon(id);
  const { data, isLoading, isError } = useAdminCouponRedemptions(id, page, LIMIT);

  const redemptions = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/coupons" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Kupon
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Riwayat Pemakaian {coupon ? `- ${coupon.code}` : ""}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{total} kali dipakai</p>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {isLoading || loadingCoupon ? (
          <div className="flex items-center justify-center gap-2 py-20 text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Memuat data...
          </div>
        ) : isError ? (
          <div className="py-20 text-center text-sm text-red-600">Gagal memuat data pemakaian.</div>
        ) : redemptions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-neutral-500">
            <p className="text-sm">Kupon ini belum pernah dipakai.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <Th>Tanggal</Th>
                  <Th>Order ID</Th>
                  <Th>User ID</Th>
                  <Th>Diskon Item</Th>
                  <Th>Diskon Ongkir</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {redemptions.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-900">
                      {new Date(r.created_at).toLocaleString("id-ID")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">{r.order_id}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">{r.user_id}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-900">{formatRupiah(r.items_discount)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-900">{formatRupiah(r.shipping_discount)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold uppercase tracking-wider ${
                          r.status === "applied" ? "bg-green-100 text-green-800" :
                          r.status === "reserved" ? "bg-yellow-100 text-yellow-800" :
                          "bg-neutral-100 text-neutral-800"
                        }`}
                      >
                        {r.status}
                      </span>
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