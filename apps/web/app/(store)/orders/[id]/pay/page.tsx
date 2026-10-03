"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Clock, Loader2, Package, ShieldCheck } from "lucide-react";

import { PaymentCountdown, useNow } from "@/components/kriya/customer/payment-countdown";
import { isPaymentWindowClosed } from "@/lib/checkout/payment-window";
import { ApiError } from "@/lib/http";

import { useLanguage } from "@/components/kriya/language-provider";
import { afterKeys, useOrder } from "@/lib/aftersales/queries";
import { usePaymentSync } from "@/lib/checkout/queries";
import { syncPayment } from "@/lib/checkout/api";
import { continuePayment } from "@/lib/customer/api";
import { loadSnap, paySnap } from "@/lib/snap";
import { formatRupiah } from "@/lib/format";

// Halaman bayar terpisah dari /checkout: checkout hanya membuat order, lalu pembeli
// diarahkan ke sini untuk membuka Snap. POST /orders/:id/pay memakai ulang snap_token
// attempt aktif (atau mengganti attempt yang rusak), jadi halaman ini aman dibuka ulang
// dari daftar/detail pesanan. Tenggat bayar (payment.expires_at) tidak pernah
// diperpanjang: setelah lewat, BE membalas 409 dan sweeper meng-expire order.
export default function OrderPayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { data: order, isLoading, isError } = useOrder(id);
  const [paying, setPaying] = useState(false);
  const sawPending = useRef(false);
  const now = useNow();

  usePaymentSync(id, order?.status);

  // Begitu order tidak lagi menunggu pembayaran (lunas lewat sync/webhook, dibatalkan,
  // kedaluwarsa), halaman bayar tidak relevan — pindah ke detail pesanan.
  useEffect(() => {
    if (!order) return;
    if (order.status === "pending_payment") {
      sawPending.current = true;
      return;
    }
    if (sawPending.current && order.status === "paid") {
      toast.success(t("checkoutV2.paymentSuccess"));
    }
    router.replace(`/orders/${id}`);
  }, [order, id, router, t]);

  async function handlePay() {
    setPaying(true);
    try {
      const { snap_token, midtrans_client_key } = await continuePayment(id);
      await loadSnap(midtrans_client_key);
      const result = await paySnap(snap_token);
      if (result === "error") {
        toast.error(t("checkoutV2.paymentError"));
        return;
      }
      // Webhook tidak sampai di localhost: tarik status dari Midtrans dulu. Kalau sudah
      // lunas, effect di atas yang mengarahkan ke detail pesanan.
      await syncPayment(id).catch(() => undefined);
      await queryClient.invalidateQueries({ queryKey: afterKeys.all });
      if (result === "pending") toast.info(t("checkoutV2.paymentPending"));
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        // 409 saat order masih pending = tenggat bayar lewat; selain itu status order
        // sudah berubah. Refresh order supaya halaman menampilkan keadaan terbaru.
        await queryClient.invalidateQueries({ queryKey: afterKeys.all });
        toast.error(
          order?.status === "pending_payment"
            ? t("checkoutV2.pay.windowClosedError")
            : t("checkoutV2.pay.notPayable"),
        );
      } else {
        toast.error(err instanceof Error ? err.message : t("checkoutV2.pay.error"));
      }
    } finally {
      setPaying(false);
    }
  }

  if (isLoading) return <div className="p-20 text-center text-neutral-500">{t("checkoutV2.loading")}</div>;
  if (isError || !order) return <div className="p-20 text-center text-red-500">{t("error.orderNotFound")}</div>;

  const expiresAt = order.payment?.expires_at ?? null;
  const windowClosed = isPaymentWindowClosed(expiresAt, now);

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <Link
        href={`/orders/${id}`}
        className="mb-6 flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("checkoutV2.pay.viewOrder")}
      </Link>

      <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">{t("checkoutV2.pay.title")}</h1>
      <p className="mt-2 text-sm text-neutral-500">
        {t("checkoutV2.pay.subtitle", { number: order.order_number })}
      </p>

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500">{t("checkoutV2.pay.total")}</p>
            <p className="mt-1 text-3xl font-semibold text-neutral-900">{formatRupiah(order.total)}</p>
          </div>
          {!windowClosed && <PaymentCountdown expiresAt={expiresAt} now={now} />}
        </div>

        <div className="mt-6 border-t border-neutral-100 pt-5">
          <h2 className="text-sm font-medium text-neutral-900">{t("checkoutV2.pay.items")}</h2>
          <ul className="mt-3 space-y-3">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 text-sm">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                  {item.thumbnail_url ? (
                    <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-full w-full p-3 text-neutral-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-neutral-900">{item.name}</p>
                  <p className="text-neutral-500">
                    {item.qty} × {formatRupiah(item.price)}
                  </p>
                </div>
                <p className="font-medium text-neutral-900">{formatRupiah(item.subtotal)}</p>
              </li>
            ))}
          </ul>
        </div>

        {windowClosed ? (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
            <p className="flex items-center gap-2 text-sm font-medium text-red-800">
              <Clock className="h-4 w-4 shrink-0" />
              {t("checkoutV2.pay.windowClosedTitle")}
            </p>
            <p className="mt-1 text-sm text-red-700">{t("checkoutV2.pay.windowClosedBody")}</p>
            <Link
              href="/"
              className="mt-3 inline-flex items-center rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              {t("checkoutV2.pay.shopAgain")}
            </Link>
          </div>
        ) : (
          <button
            type="button"
            onClick={handlePay}
            disabled={paying}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-neutral-900 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50"
          >
            {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {paying ? t("checkoutV2.pay.opening") : t("checkoutV2.pay.button")}
          </button>
        )}
        <p className="mt-3 text-center text-xs text-neutral-400">{t("checkoutV2.pay.secure")}</p>
      </div>

      {!windowClosed && (
        <p className="mt-6 text-center text-sm text-neutral-500">{t("checkoutV2.pay.waiting")}</p>
      )}
    </div>
  );
}
