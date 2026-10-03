"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, ShoppingBag, Trash2, AlertCircle } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { useLanguage } from "@/components/kriya/language-provider";
import { EmptyState } from "@/components/kriya/empty-state";
import { PriceTag } from "@/components/kriya/catalog/price-tag";

export default function CartPage() {
  const { items, total, updateQty, removeItem } = useCartStore();
  const { t } = useLanguage();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20">
        <EmptyState
          title={t("cart.empty.title")}
          hint={t("cart.empty.hint")}
          action={
            <Link
              href="/"
              className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              {t("cart.empty.action")}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{t("cart.title")}</h1>
      
      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-8">
          <ul className="divide-y divide-neutral-200 border-t border-b border-neutral-200">
            {items.map((item) => {
              const outOfStock = item.stock === 0;

              return (
                <li key={item.variant_id} className="flex py-6 sm:py-8">
                  <div className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100 sm:h-32 sm:w-32 ${outOfStock ? 'opacity-50 grayscale' : ''}`}>
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
                        {item.product.color} {item.product.size && ` - ${item.product.size}`}
                      </p>
                    </div>
                    <PriceTag price={item.subtotal} size="md" />
                  </div>
                  
                  {item.stock === 0 ? (
                    <div className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4" />
                      {t("cart.outOfStock")}
                    </div>
                  ) : item.stock < item.qty ? (
                    <div className="mt-2 text-sm text-amber-600 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4" />
                      {t("cart.notEnoughStock", { stock: item.stock })}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-1 items-end justify-between">
                    <div className="inline-flex items-center rounded-full border border-neutral-300">
                      <button
                        type="button"
                        onClick={() => updateQty(item.variant_id, item.qty - 1)}
                        className="p-1.5 text-neutral-600 disabled:opacity-40"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-6 text-center text-xs tabular-nums">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.variant_id, item.qty + 1)}
                        disabled={item.qty >= item.stock}
                        className="p-1.5 text-neutral-600 disabled:opacity-40"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => removeItem(item.variant_id)}
                      className="flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-strong"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>{t("cart.remove")}</span>
                    </button>
                  </div>
                </div>
              </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 lg:col-span-4 lg:p-8">
          <h2 className="text-lg font-medium text-neutral-900">{t("cart.summary")}</h2>
          
          <dl className="mt-6 space-y-4 text-sm text-neutral-600">
            <div className="flex justify-between">
              <dt>{t("cart.subtotal")}</dt>
              <dd className="font-medium text-neutral-900"><PriceTag price={total} size="sm" /></dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("cart.shipping")}</dt>
              <dd>{t("cart.shippingCalc")}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
              <dt className="text-base font-medium text-neutral-900">{t("cart.total")}</dt>
              <dd className="text-base font-semibold text-neutral-900"><PriceTag price={total} size="md" /></dd>
            </div>
          </dl>

          <Link
            href="/checkout"
            onClick={(e) => {
              if (items.some(i => i.stock < i.qty)) {
                e.preventDefault();
              }
            }}
            aria-disabled={items.some(i => i.stock < i.qty)}
            className={`mt-8 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-white shadow-sm focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:outline-none ${
              items.some(i => i.stock < i.qty) ? 'bg-neutral-400 cursor-not-allowed' : 'bg-neutral-900 hover:bg-neutral-800'
            }`}
          >
            {t("cart.checkout")}
            <ShoppingBag className="h-4 w-4" />
          </Link>
          
          <div className="mt-4 text-center">
            <p className="text-xs text-neutral-500">{t("cart.taxNote")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
