"use client";

import { useOrder, useStoreInfo } from "@/lib/aftersales/queries";
import { Loader2, Printer } from "lucide-react";
import { useLanguage } from "@/components/kriya/language-provider";
import { Button } from "@/components/ui/button";
import type { MessageKey } from "@/lib/i18n";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(amount);
};

export default function InvoicePage({ params }: { params: { id: string } }) {
  const { data: order, isLoading: loadingOrder } = useOrder(params.id);
  const { data: store, isLoading: loadingStore } = useStoreInfo();
  const { locale, t } = useLanguage();

  if (loadingOrder || loadingStore) {
    return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!order || !store) {
    return <div className="p-10 text-center text-red-500">{t("after.common.notFound" as MessageKey)}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white min-h-screen text-slate-900 print:p-0 print:m-0 print:w-full">
      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase mb-2">{t("after.invoice.title" as MessageKey)}</h1>
          <p className="text-sm font-medium text-slate-500">#{order.order_number}</p>
        </div>
        <div className="print:hidden">
          <Button onClick={() => window.print()} className="flex items-center gap-2">
            <Printer className="w-4 h-4" /> {t("after.invoice.print" as MessageKey)}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-10">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t("after.invoice.from" as MessageKey)}</h3>
          <p className="font-semibold text-lg">{store.name}</p>
          <p className="text-slate-600 text-sm mt-1 whitespace-pre-line">{store.address}</p>
          <p className="text-slate-600 text-sm mt-1">{store.phone}</p>
          <p className="text-slate-600 text-sm">{store.email}</p>
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t("after.invoice.to" as MessageKey)}</h3>
          <p className="font-semibold text-lg">{order.shipping_address.recipient}</p>
          <p className="text-slate-600 text-sm mt-1">{order.shipping_address.phone}</p>
          <p className="text-slate-600 text-sm mt-1 whitespace-pre-line">
            {order.shipping_address.address_line}, {order.shipping_address.city}, {order.shipping_address.province} {order.shipping_address.postal_code}
          </p>
        </div>
      </div>

      <div className="mb-10 flex gap-12 text-sm">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t("after.invoice.date" as MessageKey)}</h3>
          <p className="font-semibold">{new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(order.created_at))}</p>
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t("after.invoice.paymentMethod" as MessageKey)}</h3>
          <p className="font-semibold uppercase">Online Payment</p>
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t("after.invoice.status" as MessageKey)}</h3>
          <p className="font-semibold uppercase">{t(`after.status.${order.status}` as MessageKey)}</p>
        </div>
      </div>

      <table className="w-full text-sm mb-8 border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-900">
            <th className="py-3 px-2 text-left font-bold">{t("after.invoice.item" as MessageKey)}</th>
            <th className="py-3 px-2 text-center font-bold text-slate-500 w-24">SKU</th>
            <th className="py-3 px-2 text-right font-bold w-24">{t("after.invoice.qty" as MessageKey)}</th>
            <th className="py-3 px-2 text-right font-bold w-32">{t("after.invoice.price" as MessageKey)}</th>
            <th className="py-3 px-2 text-right font-bold w-32">{t("after.invoice.total" as MessageKey)}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <tr key={item.id}>
              <td className="py-4 px-2">
                <p className="font-semibold">{item.name}</p>
                {(item.color || item.size) && (
                  <p className="text-xs text-slate-500 mt-1">
                    {[item.color, item.size].filter(Boolean).join(" • ")}
                  </p>
                )}
              </td>
              <td className="py-4 px-2 text-center text-slate-500 font-mono text-xs">{item.sku || "-"}</td>
              <td className="py-4 px-2 text-right">{item.qty}</td>
              <td className="py-4 px-2 text-right">{formatCurrency(item.price)}</td>
              <td className="py-4 px-2 text-right font-medium">
                {formatCurrency(item.subtotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-64 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">{t("after.invoice.subtotal" as MessageKey)}</span>
            <span className="font-medium">{formatCurrency(order.subtotal)}</span>
          </div>
          {order.discount_total > 0 && (
            <div className="flex justify-between text-green-600">
              <span>{t("after.invoice.discount" as MessageKey)}</span>
              <span className="font-medium">-{formatCurrency(order.discount_total)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">{t("after.invoice.shipping" as MessageKey)}</span>
            <span className="font-medium">{formatCurrency(order.shipping_cost)}</span>
          </div>
          {order.shipping_discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>{t("after.invoice.shippingDiscount" as MessageKey)}</span>
              <span className="font-medium">-{formatCurrency(order.shipping_discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs text-slate-400">
            <span>{t("after.invoice.tax" as MessageKey)}</span>
            <span>{formatCurrency(order.tax_amount)}</span>
          </div>
          <div className="flex justify-between border-t-2 border-slate-900 pt-3 text-lg font-bold">
            <span>{t("after.invoice.grandTotal" as MessageKey)}</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-16 pt-8 border-t border-slate-200 text-center text-xs text-slate-400 print:mt-auto print:fixed print:bottom-0 print:w-full print:border-none">
        {t("after.invoice.footer" as MessageKey)}
      </div>
    </div>
  );
}
