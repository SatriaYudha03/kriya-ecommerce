"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MoveLeft, ShieldCheck, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/components/kriya/auth-provider";
import { useLanguage } from "@/components/kriya/language-provider";
import { useCartStore } from "@/stores/cart-store";
import { AddressPicker } from "@/components/kriya/customer/address-picker";
import { ShippingMethodPicker } from "@/components/kriya/customer/shipping-method-picker";
import { CouponInput } from "@/components/kriya/promo/coupon-input";
import { useCheckoutQuote, useCreateOrder } from "@/lib/checkout/queries";
import type { CheckoutQuoteRequest } from "@/lib/checkout/types";
import type { Address } from "@/lib/customer/types";
import type { QuoteCoupon } from "@/lib/types";
import { customerKeys } from "@/lib/customer/queries";
import { afterKeys } from "@/lib/aftersales/queries";
import { formatRupiah } from "@/lib/format";
import { Textarea } from "@/components/ui/textarea";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { items, total: cartSubtotal, clearCart } = useCartStore();

  const [address, setAddress] = useState<Address | null>(null);
  const [shippingMethodOverride, setShippingMethodOverride] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error(t("checkoutV2.loginRequired"));
      router.push("/login?next=/checkout");
    } else if (!authLoading && items.length === 0 && !submitting) {
      router.push("/cart");
    }
  }, [user, authLoading, items.length, router, submitting, t]);

  const lineItems = useMemo(
    () => items.map((i) => ({ variant_id: i.variant_id, qty: i.qty })),
    [items],
  );

  const quoteRequest: CheckoutQuoteRequest = useMemo(
    () => ({
      items: lineItems,
      address_id: address?.id ?? null,
      province_code: address?.province_code ?? null,
      shipping_method_id: shippingMethodOverride,
      coupon_code: couponCode,
    }),
    [lineItems, address, shippingMethodOverride, couponCode],
  );

  const debouncedQuoteRequest = useDebouncedValue(quoteRequest, 350);
  const quoteEnabled = lineItems.length > 0 && Boolean(address);
  const { data: quote, isFetching: quoteLoading } = useCheckoutQuote(debouncedQuoteRequest, quoteEnabled);

  // Default ke opsi termurah dari quote sampai pengguna memilih sendiri (dihitung saat
  // render, bukan di effect, agar tidak memicu render berantai).
  const effectiveShippingMethodId = shippingMethodOverride ?? quote?.selected_shipping_method_id ?? null;

  const createOrderMutation = useCreateOrder();

  const handleCouponApplied = (r: QuoteCoupon) => setCouponCode(r.code);
  const handleCouponRemoved = () => setCouponCode(null);

  const problems = quote?.problems ?? [];
  const hasProblems = problems.length > 0;
  const canSubmit = Boolean(address) && Boolean(effectiveShippingMethodId) && !hasProblems && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !effectiveShippingMethodId) return;
    setSubmitting(true);

    try {
      const res = await createOrderMutation.mutateAsync({
        items: lineItems,
        address_id: address.id,
        shipping_method_id: effectiveShippingMethodId,
        coupon_code: couponCode,
        customer_note: note.trim() || null,
      });

      queryClient.invalidateQueries({ queryKey: afterKeys.all });
      queryClient.invalidateQueries({ queryKey: customerKeys.all });

      // Order sudah tercipta (stok & kupon sudah direservasi): kosongkan keranjang lalu
      // pindah ke halaman bayar terpisah. `submitting` sengaja tidak di-reset agar effect
      // "keranjang kosong -> /cart" tidak menyerobot navigasi ini.
      await clearCart();
      router.replace(`/orders/${res.order.id}/pay`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("checkoutV2.orderFailed"));
      setSubmitting(false);
    }
  };

  if (authLoading || (!user && items.length > 0)) {
    return <div className="p-20 text-center">{t("checkoutV2.loading")}</div>;
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <Link href="/cart" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900">
          <MoveLeft className="h-4 w-4" />
          {t("checkoutV2.backToCart")}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-900">{t("checkoutV2.title")}</h1>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-12 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-7 space-y-8">
          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-medium text-neutral-900">{t("checkoutV2.stepAddress")}</h2>
              <Link href="/account/addresses" className="text-sm font-medium text-brand hover:text-brand-strong">
                {t("checkoutV2.manageAddresses")}
              </Link>
            </div>
            <div className="mt-4">
              <AddressPicker value={address?.id ?? null} onChange={setAddress} />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium text-neutral-900">{t("checkoutV2.stepShipping")}</h2>
            <div className="mt-4">
              {!address ? (
                <p className="text-sm text-neutral-500">{t("checkoutV2.selectAddressFirst")}</p>
              ) : (
                <ShippingMethodPicker
                  options={quote?.shipping_options ?? []}
                  value={effectiveShippingMethodId}
                  onChange={setShippingMethodOverride}
                  loading={quoteLoading && !quote}
                />
              )}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium text-neutral-900">{t("checkoutV2.stepCoupon")}</h2>
            <div className="mt-4">
              <CouponInput
                items={lineItems}
                appliedCode={couponCode}
                onApplied={handleCouponApplied}
                onRemoved={handleCouponRemoved}
              />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium text-neutral-900">{t("checkoutV2.stepNote")}</h2>
            <div className="mt-4">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("checkoutV2.notePlaceholder")}
                rows={3}
              />
            </div>
          </section>
        </div>

        <div className="lg:col-span-5">
          <div className="sticky top-24 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 lg:p-8">
            <h2 className="text-lg font-medium text-neutral-900">{t("checkoutV2.summary")}</h2>

            <ul className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200">
              {items.map((item) => (
                <li key={item.variant_id} className="flex py-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    <Image
                      src={item.product.thumbnail_url}
                      alt={item.product.name}
                      fill
                      className="object-cover object-center"
                      unoptimized={item.product.thumbnail_url.startsWith("http")}
                    />
                  </div>
                  <div className="ml-4 flex flex-1 flex-col justify-center">
                    <div className="flex justify-between text-sm">
                      <div className="font-medium text-neutral-900">{item.product.name}</div>
                      <div className="font-medium text-neutral-900">{formatRupiah(item.subtotal)}</div>
                    </div>
                    <p className="mt-1 text-sm text-neutral-500">
                      {item.product.color} {item.product.size && `· ${item.product.size}`} (x{item.qty})
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {hasProblems && (
              <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  {t("checkoutV2.problemsTitle")}
                </div>
                <ul className="mt-2 space-y-1 text-sm text-amber-700">
                  {problems.map((p) => (
                    <li key={p.variant_id}>
                      {p.code === "insufficient_stock"
                        ? t("checkoutV2.problemInsufficientStock", { available: p.available })
                        : t("checkoutV2.problemUnavailable")}
                    </li>
                  ))}
                </ul>
                <Link href="/cart" className="mt-2 inline-block text-sm font-medium text-brand hover:text-brand-strong">
                  {t("checkoutV2.backToCartLink")}
                </Link>
              </div>
            )}

            <dl className="mt-6 space-y-4 text-sm text-neutral-600">
              <div className="flex justify-between">
                <dt>{t("checkoutV2.subtotal")}</dt>
                <dd className="font-medium text-neutral-900">{formatRupiah(quote?.subtotal ?? cartSubtotal)}</dd>
              </div>
              {quote && quote.discount_total > 0 && (
                <div className="flex justify-between">
                  <dt>{t("checkoutV2.discount")}</dt>
                  <dd className="font-medium text-emerald-700">-{formatRupiah(quote.discount_total)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt>{t("checkoutV2.shipping")}</dt>
                <dd className="font-medium text-neutral-900">
                  {quote && quote.shipping_cost === 0
                    ? t("checkoutV2.shippingFree")
                    : formatRupiah(quote?.shipping_cost ?? 0)}
                </dd>
              </div>
              {quote && quote.shipping_discount > 0 && (
                <div className="flex justify-between">
                  <dt>{t("checkoutV2.shippingDiscount")}</dt>
                  <dd className="font-medium text-emerald-700">-{formatRupiah(quote.shipping_discount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-xs text-neutral-400">
                <dt>{t("checkoutV2.taxIncluded")}</dt>
                <dd>{formatRupiah(quote?.tax_amount ?? 0)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
                <dt className="text-base font-medium text-neutral-900">{t("checkoutV2.total")}</dt>
                <dd className="text-base font-semibold text-neutral-900">
                  {formatRupiah(quote?.total ?? cartSubtotal)}
                </dd>
              </div>
            </dl>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-neutral-900 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              {submitting ? t("checkoutV2.submitting") : t("checkoutV2.submit")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
