"use client";

import { useOrders } from "@/lib/aftersales/queries";
import { formatRupiah } from "@/lib/format";
import Link from "next/link";
import { MoveRight, Package, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { OrderStatusBadge } from "@/components/kriya/aftersales/order-status-badge";
import { useLanguage } from "@/components/kriya/language-provider";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const STATUS_TABS = [
  { value: "", label: "Semua" },
  { value: "pending_payment", label: "Menunggu" },
  { value: "processing", label: "Diproses" },
  { value: "shipped", label: "Dikirim" },
  { value: "completed", label: "Selesai" },
];

export default function OrdersPage() {
  const { t, locale } = useLanguage();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const { data: envelope, isLoading, isError, error, refetch } = useOrders(page, 10, status);

  if (isLoading) {
    return <div className="p-20 text-center text-neutral-500">{t("after.orders.loading")}</div>;
  }

  if (isError) {
    const isUnauthorized = (error as { status?: number })?.status === 401;
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="mt-5 text-xl font-medium">
          {isUnauthorized ? t("after.orders.error.login") : t("after.orders.error.title")}
        </h1>
        {!isUnauthorized && (
          <Button onClick={() => refetch()} variant="outline" className="mt-4">
            {t("after.orders.error.retry")}
          </Button>
        )}
      </div>
    );
  }

  const orders = envelope?.data || [];
  const meta = envelope?.meta;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{t("after.orders.title")}</h1>
      
      <div className="mt-6 flex flex-wrap gap-2 border-b border-neutral-200 pb-4">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              status === tab.value
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint text-brand-strong">
            <Package className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-neutral-900">{t("after.orders.empty.title")}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-neutral-500">
            {t("after.orders.empty.body")}
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            {t("after.orders.empty.cta")}
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium text-neutral-900">
                        {order.order_number || order.id.split("-")[0].toUpperCase()}
                      </p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="mt-1 text-sm text-neutral-500">
                      {new Date(order.created_at).toLocaleDateString(locale, {
                        year: "numeric", month: "long", day: "numeric"
                      })}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-neutral-500">{t("after.orders.card.total")}</p>
                    <p className="font-medium text-neutral-900">{formatRupiah(order.total)}</p>
                  </div>
                </div>

                <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
                  {order.items.slice(0, 4).map((item) => (
                    <div key={item.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-neutral-200">
                      {item.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.thumbnail_url} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-neutral-100">
                          <Package className="h-5 w-5 text-neutral-400" />
                        </div>
                      )}
                    </div>
                  ))}
                  {order.items.length > 4 && (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-sm font-medium text-neutral-500">
                      +{order.items.length - 4}
                    </div>
                  )}
                </div>

                <div className="mt-4 border-t border-neutral-100 pt-4 flex items-center justify-between">
                  <p className="text-sm text-neutral-600">
                    {t("after.orders.card.itemCount").replace("{count}", String(order.items.length))}
                  </p>
                  <div className="flex gap-3 items-center">
                    {order.payment?.can_continue && (
                      <Link
                        href={`/checkout?order_id=${order.id}`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-strong"
                      >
                        {t("after.orders.card.pay")}
                      </Link>
                    )}
                    <Link
                      href={`/orders/${order.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-strong"
                    >
                      {t("after.orders.card.detail")}
                      <MoveRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {meta && meta.total > meta.limit && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-neutral-500">
                Halaman {page} dari {Math.ceil(meta.total / meta.limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(meta.total / meta.limit)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
