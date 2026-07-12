"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { useLanguage } from "@/components/kriya/language-provider";
import { formatRupiah } from "@/lib/format";
import { EmptyState } from "@/components/kriya/empty-state";

export default function CartPage() {
  const { items, total, updateQty, removeItem, loading } = useCartStore();
  const { t } = useLanguage();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20">
        <EmptyState
          title={t("cart.empty.title" as any)}
          hint={t("cart.empty.hint" as any)}
          action={
            <Link
              href="/"
              className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              {t("cart.empty.action" as any)}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{t("cart.title" as any)}</h1>
      
      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-8">
          <ul className="divide-y divide-neutral-200 border-t border-b border-neutral-200">
            {items.map((item) => (
              <li key={item.variant_id} className="flex py-6 sm:py-8">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100 sm:h-32 sm:w-32">
                  <Image
                    src={item.product.thumbnail_url}
                    alt={item.product.name}
                    fill
                    className="object-cover object-center"
                    unoptimized={item.product.thumbnail_url.startsWith("http")}
                  />
                </div>
                <div className="ml-4 flex flex-1 flex-col sm:ml-6">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-neutral-900">
                        <Link href={`/products/${item.product.slug}`}>{item.product.name}</Link>
                      </h3>
                      <p className="mt-1 text-sm text-neutral-500">
                        {item.product.color} {item.product.size && `· ${item.product.size}`}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-neutral-900">{formatRupiah(item.subtotal)}</p>
                  </div>
                  
                  <div className="mt-4 flex flex-1 items-end justify-between">
                    <div className="inline-flex items-center rounded-full border border-neutral-300">
                      <button
                        type="button"
                        onClick={() => updateQty(item.variant_id, item.qty - 1)}
                        disabled={loading}
                        className="p-1.5 text-neutral-600 disabled:opacity-40"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-6 text-center text-xs tabular-nums">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.variant_id, item.qty + 1)}
                        disabled={loading}
                        className="p-1.5 text-neutral-600 disabled:opacity-40"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => removeItem(item.variant_id)}
                      disabled={loading}
                      className="flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-strong disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>{t("cart.remove" as any)}</span>
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 lg:col-span-4 lg:p-8">
          <h2 className="text-lg font-medium text-neutral-900">{t("cart.summary" as any)}</h2>
          
          <dl className="mt-6 space-y-4 text-sm text-neutral-600">
            <div className="flex justify-between">
              <dt>{t("cart.subtotal" as any)}</dt>
              <dd className="font-medium text-neutral-900">{formatRupiah(total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("cart.shipping" as any)}</dt>
              <dd>{t("cart.shippingCalc" as any)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
              <dt className="text-base font-medium text-neutral-900">{t("cart.total" as any)}</dt>
              <dd className="text-base font-semibold text-neutral-900">{formatRupiah(total)}</dd>
            </div>
          </dl>

          <Link
            href="/checkout"
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-neutral-900 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-neutral-800 focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:outline-none"
          >
            {t("cart.checkout" as any)}
            <ShoppingBag className="h-4 w-4" />
          </Link>
          
          <div className="mt-4 text-center">
            <p className="text-xs text-neutral-500">{t("cart.taxNote" as any)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
