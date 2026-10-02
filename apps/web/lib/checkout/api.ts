import { request, USE_FIXTURES } from "../http";
import type { Envelope } from "../http";
import type {
  CheckoutQuote,
  CheckoutQuoteRequest,
  CreateOrderPayload,
  CreateOrderResponse,
  SyncPaymentResponse,
} from "./types";
import { fixtures } from "./fixtures";

export async function getCheckoutQuote(payload: CheckoutQuoteRequest): Promise<CheckoutQuote> {
  if (USE_FIXTURES) {
    return new Promise((resolve) => setTimeout(() => resolve(fixtures.quote(payload)), 300));
  }
  const { data } = await request<Envelope<CheckoutQuote>>("/api/v1/checkout/quote", {
    method: "POST",
    body: payload,
    auth: true,
  });
  return data;
}

export async function createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
  if (USE_FIXTURES) {
    return new Promise((resolve) => setTimeout(() => resolve(fixtures.createOrderResponse(payload)), 400));
  }
  const { data } = await request<Envelope<CreateOrderResponse>>("/api/v1/orders", {
    method: "POST",
    body: payload,
    auth: true,
  });
  return data;
}

// Cadangan webhook Midtrans: BE menanyakan status transaksi langsung ke Midtrans lalu
// memperbarui order. Aman dipanggil berulang (idempoten di BE).
export async function syncPayment(orderId: string): Promise<SyncPaymentResponse> {
  const { data } = await request<Envelope<SyncPaymentResponse>>(`/api/v1/orders/${orderId}/payment/sync`, {
    method: "POST",
    auth: true,
  });
  return data;
}
