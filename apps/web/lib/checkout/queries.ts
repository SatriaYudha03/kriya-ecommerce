import { useMutation, useQuery } from "@tanstack/react-query";
import { getCheckoutQuote, createOrder } from "./api";
import type { CheckoutQuoteRequest, CreateOrderPayload } from "./types";

export const checkoutKeys = {
  all: ["checkout"] as const,
  quote: (req: CheckoutQuoteRequest) => [...checkoutKeys.all, "quote", req] as const,
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
