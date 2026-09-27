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
  const { data, isLoading } = useAdminCustomerDetail(id);

  if (isLoading) {
    return <div className="p-6"><Loader2 className="animate-spin w-6 h-6 text-muted-foreground" /></div>;
  }

  if (!data) return null;

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <Link href="/admin/customers">
          <Button variant="ghost" className="mb-4 -ml-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">{t("adminCustomer.customerDetail.title")}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card text-card-foreground shadow rounded-xl border">
            <div className="p-6">
              <h3 className="font-semibold leading-none tracking-tight">Profil</h3>
            </div>
            <div className="p-6 pt-0 space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Nama</div>
                <div className="font-medium">{data.full_name || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="font-medium">{data.email}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">No. HP</div>
                <div className="font-medium">{data.phone || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Tgl Daftar</div>
                <div className="font-medium">{new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(data.created_at))}</div>
              </div>
            </div>
          </div>

          <div className="bg-card text-card-foreground shadow rounded-xl border">
            <div className="p-6">
              <h3 className="font-semibold leading-none tracking-tight">Statistik</h3>
            </div>
            <div className="p-6 pt-0 space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">{t("adminCustomer.customerDetail.ordersCount")}</div>
                <div className="font-medium text-2xl">{data.orders_count}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t("adminCustomer.customerDetail.totalSpent")}</div>
                <div className="font-medium text-2xl text-green-600">{formatRupiah(data.total_spent)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-card text-card-foreground shadow rounded-xl border">
            <div className="p-6">
              <h3 className="font-semibold leading-none tracking-tight">{t("adminCustomer.customerDetail.recentOrders")}</h3>
            </div>
            <div className="p-6 pt-0">
              {data.recent_orders.length === 0 ? (
                <div className="text-sm text-muted-foreground">Belum ada pesanan</div>
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
                        <div className="font-medium">{formatRupiah(order.total)}</div>
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
              <h3 className="font-semibold leading-none tracking-tight">{t("adminCustomer.customerDetail.addresses")}</h3>
            </div>
            <div className="p-6 pt-0">
              {data.addresses.length === 0 ? (
                <div className="text-sm text-muted-foreground">Belum ada alamat</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.addresses.map(addr => (
                    <div key={addr.id} className="border rounded-md p-4 text-sm relative">
                      {addr.is_default && (
                        <span className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">Utama</span>
                      )}
                      <div className="font-medium mb-1">{addr.label}</div>
                      <div className="text-muted-foreground">{addr.recipient} ({addr.phone})</div>
                      <div className="text-muted-foreground mt-2">
                        {addr.address_line}<br/>
                        {addr.district ? `${addr.district}, ` : ""}{addr.city}<br/>
                        {addr.province} {addr.postal_code}
                      </div>
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
