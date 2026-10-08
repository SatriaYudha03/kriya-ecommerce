"use client";

import Link from "next/link";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Package } from "lucide-react";
import { useAdminOrders, useUpdateOrderStatus } from "@/lib/aftersales/queries";
import { formatRupiah } from "@/lib/format";
import type { OrderStatus } from "@/lib/aftersales/types";
import { OrderStatusBadge } from "@/components/kriya/aftersales/order-status-badge";
import { useLanguage } from "@/components/kriya/language-provider";

const STATUS_KEYS: OrderStatus[] = [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "completed",
  "cancelled",
  "expired",
];

const LIMIT = 20;

export default function AdminOrdersPage() {
  const { t, locale } = useLanguage();
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useAdminOrders({
    status: status || undefined,
    page,
    limit: LIMIT,
  });
  const updateStatus = useUpdateOrderStatus();
  const [shipOrderId, setShipOrderId] = useState<string | null>(null);
  const [courier, setCourier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");

  const closeShipDialog = () => {
    setShipOrderId(null);
    setCourier("");
    setTrackingNumber("");
  };
  const submitShipment = () => {
    if (!shipOrderId) return;
    updateStatus.mutate(
      { id: shipOrderId, status: "shipped", courier: courier.trim(), trackingNumber: trackingNumber.trim() },
      { onSuccess: closeShipDialog },
    );
  };

  const orders = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t("after.admin.orders.title")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("after.admin.orders.count").replace("{count}", String(total))}</p>
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrderStatus | "");
            setPage(1);
          }}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">{t("after.admin.orders.filterAll")}</option>
            {STATUS_KEYS.map((s) => (
              <option key={s} value={s}>
                {t(`after.status.${s}` as const)}
              </option>
            ))}
        </select>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin" /> {t("after.admin.orders.loading")}
          </div>
        ) : isError ? (
          <div className="py-20 text-center text-sm text-red-600">{t("after.admin.orders.error")}</div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-neutral-500">
            <Package className="h-10 w-10 text-neutral-300" />
            <p className="text-sm font-medium">{t("after.admin.orders.empty")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
              <tr>
                <Th>{t("after.admin.orders.thOrderId")}</Th>
                <Th>{t("after.admin.orders.thDate")}</Th>
                <Th>{t("after.admin.orders.thRecipient")}</Th>
                <Th>{t("after.admin.orders.thTotal")}</Th>
                <Th>{t("after.admin.orders.thStatus")}</Th>
                <Th className="text-right">{t("after.admin.orders.thAction")}</Th>
              </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {orders.map((o) => {
                  const rowPending =
                    updateStatus.isPending && updateStatus.variables?.id === o.id;
                  return (
                    <tr key={o.id}>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-neutral-900">
                        <Link href={`/admin/orders/${o.id}`} className="hover:underline text-blue-600">
                          {o.id.split("-")[0]}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                        {new Date(o.created_at).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-700">
                        <div>{o.shipping_address.recipient}</div>
                        <div className="text-xs text-neutral-400">{o.shipping_address.phone}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-900">
                        {formatRupiah(o.total)}
                      </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <OrderStatusBadge status={o.status} />
                        </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <select
                          value={(o.status as string) === "delivered" ? "completed" : (o.status as string) === "pending" || (o.status as string) === "awaiting_payment" ? "pending_payment" : o.status}
                          disabled={rowPending}
                          onChange={(e) => {
                            const next = e.target.value as OrderStatus;
                            // "Dikirim" butuh kurir & resi: buka form dulu, jangan kirim langsung.
                            if (next === "shipped") setShipOrderId(o.id);
                            else updateStatus.mutate({ id: o.id, status: next });
                          }}
                          className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm disabled:opacity-50"
                        >
                          {STATUS_KEYS.map((s) => (
                            <option key={s} value={s}>
                              {t(`after.status.${s}` as const)}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
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
            {t("after.common.prev")}
          </button>
          <span className="text-neutral-500">
            {t("after.common.pageOf").replace("{page}", String(page)).replace("{total}", String(totalPages))}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-neutral-300 px-4 py-2 disabled:opacity-40"
          >
            {t("after.common.next")}
          </button>
        </div>
      )}
      <Dialog open={shipOrderId !== null} onOpenChange={(open) => { if (!open) closeShipDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("after.admin.orders.ship.title")}</DialogTitle>
            <DialogDescription>{t("after.admin.orders.ship.desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-neutral-700">
              {t("after.admin.orders.ship.courier")}
              <input
                type="text"
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                placeholder={t("after.admin.orders.ship.courierPlaceholder")}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              {t("after.admin.orders.ship.tracking")}
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder={t("after.admin.orders.ship.trackingPlaceholder")}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal"
              />
            </label>
          </div>
          <DialogFooter>
            <button type="button" onClick={closeShipDialog} className="rounded-md border border-neutral-300 px-4 py-2 text-sm">
              {t("after.admin.orders.ship.cancel")}
            </button>
            <button
              type="button"
              onClick={submitShipment}
              disabled={updateStatus.isPending || !courier.trim() || !trackingNumber.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {updateStatus.isPending ? t("after.admin.orders.ship.submitting") : t("after.admin.orders.ship.submit")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
