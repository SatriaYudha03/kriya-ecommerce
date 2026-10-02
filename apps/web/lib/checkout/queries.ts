import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCheckoutQuote, createOrder, syncPayment } from "./api";
import type { CheckoutQuoteRequest, CreateOrderPayload } from "./types";
import type { OrderStatus } from "../aftersales/types";
import { afterKeys } from "../aftersales/queries";

export const checkoutKeys = {
  all: ["checkout"] as const,
  quote: (req: CheckoutQuoteRequest) => [...checkoutKeys.all, "quote", req] as const,
  paymentSync: (orderId: string) => [...checkoutKeys.all, "payment-sync", orderId] as const,
};

export function useCheckoutQuote(req: CheckoutQuoteRequest, enabled: boolean) {
  return useQuery({
    queryKey: checkoutKeys.quote(req),
    queryFn: () => getCheckoutQuote(req),
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => createOrder(payload),
  });
}

const PAYMENT_SYNC_INTERVAL_MS = 15_000;

// Selama order masih pending_payment, tarik status dari Midtrans (lewat BE) saat halaman
// dibuka, saat tab kembali fokus (mis. habis bayar di Payment Simulator), dan berkala.
// Begitu status berubah, data order di-refresh. Cadangan untuk webhook yang tidak sampai.
export function usePaymentSync(orderId: string, status: OrderStatus | undefined) {
  const queryClient = useQueryClient();
  const enabled = Boolean(orderId) && status === "pending_payment";
  const { data } = useQuery({
    queryKey: checkoutKeys.paymentSync(orderId),
    queryFn: () => syncPayment(orderId),
    enabled,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: enabled ? PAYMENT_SYNC_INTERVAL_MS : false,
  });

  const syncedStatus = data?.status;
  useEffect(() => {
    if (syncedStatus && status && syncedStatus !== status) {
      queryClient.invalidateQueries({ queryKey: afterKeys.all });
    }
  }, [syncedStatus, status, queryClient]);
}
