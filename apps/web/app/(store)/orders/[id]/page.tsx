"use client";

import { use } from "react";
import { useOrder } from "@/lib/aftersales/queries";
import { usePaymentSync } from "@/lib/checkout/queries";
import type { OrderStatus } from "@/lib/aftersales/types";
import { formatRupiah } from "@/lib/format";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Package } from "lucide-react";
import { useLanguage } from "@/components/kriya/language-provider";
import { OrderStatusBadge } from "@/components/kriya/aftersales/order-status-badge";
import { CancelOrderDialog } from "@/components/kriya/aftersales/cancel-order-dialog";
import { ReturnOrderDialog } from "@/components/kriya/aftersales/return-order-dialog";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, locale } = useLanguage();
  const { data: order, isLoading, isError } = useOrder(id);
  usePaymentSync(id, order?.status);

  if (isLoading) return <div className="p-20 text-center text-neutral-500">{t("after.orders.loading")}</div>;
  if (isError || !order) return <div className="p-20 text-center text-red-500">{t("error.orderNotFound")}</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link
        href="/orders"
        className="mb-6 flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("after.orders.detail.back")}
      </Link>

      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        {/* Header Section */}
        <div className="border-b border-neutral-100 bg-neutral-50/50 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
                  {order.order_number || order.id.split("-")[0].toUpperCase()}
                </h1>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                {t("after.orders.detail.createdAt")}:{" "}
                <span className="font-medium text-neutral-900">
                  {new Date(order.created_at).toLocaleDateString(locale, {
                    year: "numeric", month: "long", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </p>
            </div>
            
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              {order.can_cancel && (
                <CancelOrderDialog orderId={order.id} />
              )}
              {order.can_return && (
                <ReturnOrderDialog orderId={order.id} items={order.items} />
              )}
              {order.payment?.can_continue && (
                <Link 
                  href={`/orders/${order.id}/pay`}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-neutral-900 text-neutral-50 hover:bg-neutral-900/90 h-10 px-4 py-2"
                >
                  {t("after.orders.card.pay")}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 divide-y divide-neutral-100 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          <div className="p-6 lg:col-span-2">
            <h2 className="font-semibold text-neutral-900">{t("after.orders.detail.items")}</h2>
            <div className="mt-4 flow-root">
              <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                  <table className="min-w-full divide-y divide-neutral-200">
                    <thead>
                      <tr>
                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-0">
                          {t("after.orders.th.product")}
                        </th>
                        <th className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900">
                          {t("after.orders.th.price")}
                        </th>
                        <th className="px-3 py-3.5 text-right text-sm font-semibold text-neutral-900">
                          {t("after.orders.th.qty")}
                        </th>
                        <th className="py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-neutral-900 sm:pr-0">
                          {t("after.orders.th.subtotal")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {order.items.map((item) => (
                        <tr key={item.id || `${item.name}-${item.color}`}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-0 flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 rounded bg-neutral-100 overflow-hidden">
                              {item.thumbnail_url ? (
                                <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Package className="h-full w-full p-2 text-neutral-400" />
                              )}
                            </div>
                            <div>
                              {item.product_slug ? (
                                <Link href={`/products/${item.product_slug}`} className="font-medium text-neutral-900 hover:underline inline-flex items-center gap-1">
                                  {item.name} <ExternalLink className="h-3 w-3 text-neutral-400" />
                                </Link>
                              ) : (
                                <div className="font-medium text-neutral-900">{item.name}</div>
                              )}
                              <div className="mt-1 text-neutral-500">
                                {item.color} {item.size && `/ ${item.size}`}
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-neutral-500">
                            {formatRupiah(item.price)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-neutral-500">
                            {item.qty}
                          </td>
                          <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium text-neutral-900 sm:pr-0">
                            {formatRupiah(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="mt-10 border-t border-neutral-200 pt-6">
              <h2 className="font-semibold text-neutral-900">{t("after.orders.detail.timeline")}</h2>
              <div className="mt-4 space-y-4">
                {order.timeline?.length > 0 ? (
                  order.timeline.map((ev, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-24 shrink-0 text-sm text-neutral-500">
                        {new Date(ev.created_at).toLocaleDateString(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="flex-1 text-sm">
                        <div className="font-medium text-neutral-900"><OrderStatusBadge status={ev.status as OrderStatus} /></div>
                        {ev.note && <div className="mt-1 text-neutral-600">{ev.note}</div>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-neutral-500">{t("after.orders.detail.timelineEmpty")}</div>
                )}
              </div>
            </div>

            {/* Public Notes */}
            {order.notes && order.notes.length > 0 && (
              <div className="mt-10 border-t border-neutral-200 pt-6">
                <h2 className="font-semibold text-neutral-900">{t("after.orders.detail.publicNotes")}</h2>
                <div className="mt-4 space-y-4">
                  {order.notes.map((note) => (
                    <div key={note.id} className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
                      <div className="font-medium">{note.author_name || "Admin"} • {new Date(note.created_at).toLocaleDateString(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                      <div className="mt-1">{note.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-neutral-50 p-6 lg:bg-transparent space-y-8">
            {/* Courier Info */}
            {(order.courier || order.tracking_number) && (
              <div>
                <h2 className="font-semibold text-neutral-900">{t("after.orders.detail.shipping")}</h2>
                <div className="mt-4 text-sm text-neutral-600">
                  <p className="font-medium text-neutral-900">{order.courier || t("after.orders.detail.courier")}</p>
                  {order.tracking_number && (
                    <p className="mt-1">{t("after.orders.detail.trackingNumber")}: <span className="font-medium text-neutral-900">{order.tracking_number}</span></p>
                  )}
                </div>
              </div>
            )}

            <div>
              <h2 className="font-semibold text-neutral-900">{t("after.orders.detail.shippingAddress")}</h2>
              <div className="mt-4 text-sm text-neutral-600">
                <p className="font-medium text-neutral-900">{order.shipping_address.recipient}</p>
                <p className="mt-1">{order.shipping_address.phone}</p>
                <p className="mt-2">{order.shipping_address.address_line}</p>
                <p>
                  {order.shipping_address.city}, {order.shipping_address.province}{" "}
                  {order.shipping_address.postal_code}
                </p>
              </div>
            </div>

            <div className="mt-8 border-t border-neutral-200 pt-6">
              <h2 className="font-semibold text-neutral-900">{t("after.orders.detail.costSummary")}</h2>
              <dl className="mt-4 space-y-3 text-sm text-neutral-600">
                <div className="flex justify-between">
                  <dt>{t("after.orders.detail.subtotal")}</dt>
                  <dd className="font-medium text-neutral-900">{formatRupiah(order.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{t("after.orders.detail.shippingCost")}</dt>
                  <dd className="font-medium text-neutral-900">{formatRupiah(order.shipping_cost)}</dd>
                </div>
                {order.discount_total > 0 && (
                  <div className="flex justify-between text-green-600">
                    <dt>{t("after.orders.detail.discount")}</dt>
                    <dd className="font-medium">- {formatRupiah(order.discount_total)}</dd>
                  </div>
                )}
                {order.shipping_discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <dt>{t("after.orders.detail.shippingDiscount")}</dt>
                    <dd className="font-medium">- {formatRupiah(order.shipping_discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-neutral-200 pt-3 text-base font-semibold text-neutral-900">
                  <dt>{t("after.orders.detail.total")}</dt>
                  <dd>{formatRupiah(order.total)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
