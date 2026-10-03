import { request, USE_FIXTURES } from "../http";
import type { Envelope, ListEnvelope } from "../http";
import type {
  CheckoutQuote,
  CheckoutQuoteRequest,
  CreateOrderPayload,
  CreateOrderResponse,
  PaymentAnomaly,
  PaymentAnomalyFilter,
  ResolvePaymentAnomalyPayload,
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

// Admin — anomali pembayaran (RENCANA-PAYMENT-LIFECYCLE Fase 4).
export async function getAdminPaymentAnomalies(
  status: PaymentAnomalyFilter = "open",
  page: number = 1,
  limit: number = 20,
): Promise<ListEnvelope<PaymentAnomaly>> {
  if (USE_FIXTURES) return fixtures.paymentAnomalies(status, page, limit);
  const query = new URLSearchParams({ status, page: page.toString(), limit: limit.toString() });
  return request<ListEnvelope<PaymentAnomaly>>(`/api/v1/admin/payment-anomalies?${query.toString()}`, { auth: true });
}

export async function resolvePaymentAnomaly(id: string, payload: ResolvePaymentAnomalyPayload): Promise<PaymentAnomaly> {
  if (USE_FIXTURES) return fixtures.resolvePaymentAnomaly(id, payload);
  const { data } = await request<Envelope<PaymentAnomaly>>(`/api/v1/admin/payment-anomalies/${id}/resolve`, {
    method: "POST",
    body: payload,
    auth: true,
  });
  return data;
}
