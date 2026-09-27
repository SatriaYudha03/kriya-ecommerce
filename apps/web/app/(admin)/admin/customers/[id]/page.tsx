"use client";

import { useAdminCustomerDetail } from "@/lib/customer/queries";
import { useLanguage } from "@/components/kriya/language-provider";
import { formatRupiah } from "@/lib/format";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/kriya/aftersales/order-status-badge";
import type { OrderStatus } from "@/lib/aftersales/types";
import { useParams } from "next/navigation";

export default function CustomerDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  const id = params.id as string;
  const { data, isLoading, isError } = useAdminCustomerDetail(id);

  if (isLoading) {
    return <div className="p-6"><Loader2 className="animate-spin w-6 h-6 text-muted-foreground" /></div>;
  }

  if (isError || !data) {
    return (
      <div className="p-6 max-w-5xl">
        <Link href="/admin/customers">
          <Button variant="ghost" className="mb-4 -ml-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("adminCustomer.customerDetail.back")}
          </Button>
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
          <p className="text-sm font-medium">Data pelanggan tidak ditemukan atau gagal dimuat.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <Link href="/admin/customers">
          <Button variant="ghost" className="mb-4 -ml-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("adminCustomer.customerDetail.back")}
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">{t("adminCustomer.customerDetail.title")}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card text-card-foreground shadow rounded-xl border">
            <div className="p-6">
              <h2 className="font-semibold leading-none tracking-tight">{t("adminCustomer.customerDetail.profile")}</h2>
            </div>
            <div className="p-6 pt-0 space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">{t("adminCustomer.customerDetail.name")}</div>
                <div className="font-medium">{data.full_name || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t("adminCustomer.customerDetail.email")}</div>
                <div className="font-medium">{data.email}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t("adminCustomer.customerDetail.phone")}</div>
                <div className="font-medium">{data.phone || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t("adminCustomer.customerDetail.registered")}</div>
                <div className="font-medium">{new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(data.created_at))}</div>
              </div>
            </div>
          </div>

          <div className="bg-card text-card-foreground shadow rounded-xl border">
            <div className="p-6">
              <h2 className="font-semibold leading-none tracking-tight">{t("adminCustomer.customerDetail.stats")}</h2>
            </div>
            <div className="p-6 pt-0 space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">{t("adminCustomer.customerDetail.ordersCount")}</div>
                <div className="font-medium text-2xl">{data.orders_count}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t("adminCustomer.customerDetail.totalSpent")}</div>
                <div className="font-medium text-2xl text-emerald-600 dark:text-emerald-400">{formatRupiah(data.total_spent)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-card text-card-foreground shadow rounded-xl border">
            <div className="p-6">
              <h2 className="font-semibold leading-none tracking-tight">{t("adminCustomer.customerDetail.recentOrders")}</h2>
            </div>
            <div className="p-6 pt-0">
              {data.recent_orders.length === 0 ? (
                <div className="text-sm text-muted-foreground">{t("adminCustomer.customerDetail.noOrders")}</div>
              ) : (
                <div className="space-y-4">
                  {data.recent_orders.map(order => (
                    <div key={order.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                      <div>
                        <div className="font-medium">{order.order_number}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(order.created_at))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium mb-1">{formatRupiah(order.total)}</div>
                        <OrderStatusBadge status={order.status as OrderStatus} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-card text-card-foreground shadow rounded-xl border">
            <div className="p-6">
              <h2 className="font-semibold leading-none tracking-tight">{t("adminCustomer.customerDetail.addresses")}</h2>
            </div>
            <div className="p-6 pt-0">
              {data.addresses.length === 0 ? (
                <div className="text-sm text-muted-foreground">{t("adminCustomer.customerDetail.noAddresses")}</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.addresses.map(addr => (
                    <div key={addr.id} className="border rounded-md p-4 text-sm relative">
                      {addr.is_default && (
                        <span className="absolute top-3 right-3 text-xs bg-brand/10 text-brand font-semibold px-2 py-0.5 rounded-full">
                          {t("adminCustomer.customerDetail.defaultBadge")}
                        </span>
                      )}
                      <div className="font-semibold text-neutral-900 mb-1">{addr.label}</div>
                      <div className="font-medium">{addr.recipient} ({addr.phone})</div>
                      <div className="text-muted-foreground mt-1 line-clamp-2">{addr.address_line}</div>
                      <div className="text-muted-foreground">{addr.district ? `${addr.district}, ` : ""}{addr.city}, {addr.province} {addr.postal_code}</div>
                      {addr.notes && (
                        <div className="text-xs text-muted-foreground italic mt-2">
                          {t("adminCustomer.customerDetail.notes")}: {addr.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
