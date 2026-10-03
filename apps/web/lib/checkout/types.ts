import type { PutCartPayloadItem } from "../customer/types";
import type { Order, OrderStatus } from "../aftersales/types";

export interface CheckoutQuoteRequest {
  items: PutCartPayloadItem[];
  address_id: string | null;
  province_code: string | null;
  shipping_method_id: string | null;
  coupon_code: string | null;
}

export interface CreateOrderPayload {
  items: PutCartPayloadItem[];
  address_id: string;
  shipping_method_id: string;
  coupon_code: string | null;
  customer_note: string | null;
}

export interface CreateOrderResponse {
  order: Order;
  snap_token: string;
  midtrans_client_key: string;
}

// POST /orders/:id/payment/sync — status order setelah ditarik dari Midtrans.
export interface SyncPaymentResponse {
  status: OrderStatus;
}

export interface QuoteShippingOption {
  method_id: string;
  code: string;
  name: string;
  cost: number;
  is_free: boolean;
  eta_min_days: number;
  eta_max_days: number;
}

export interface QuoteLine {
  variant_id: string;
  product_slug: string;
  name: string;
  color: string;
  size: string | null;
  thumbnail_url: string;
  qty: number;
  unit_price: number;
  regular_price: number;
  discount_amount: number;
  subtotal: number;
}

export interface QuoteCoupon {
  code: string;
  valid: boolean;
  reason: string;
  discount_type: string;
}

export interface QuoteProblem {
  variant_id: string;
  code: "insufficient_stock" | "unavailable";
  available: number;
}

export interface CheckoutQuote {
  lines: QuoteLine[];
  subtotal: number;
  discount_total: number;
  shipping_options: QuoteShippingOption[];
  selected_shipping_method_id: string | null;
  shipping_cost: number;
  shipping_discount: number;
  tax_amount: number;
  total: number;
  total_weight_kg: number;
  coupon: QuoteCoupon | null;
  problems: QuoteProblem[];
}

// GET /admin/payment-anomalies — uang masuk untuk order yang sudah tertutup
// (paid_after_close) atau pembayaran kedua untuk order lunas (double_payment).
// RENCANA-PAYMENT-LIFECYCLE Fase 4.
export type PaymentAnomalyKind = "paid_after_close" | "double_payment";
export type PaymentAnomalyResolution = "refunded" | "ignored";
export type PaymentAnomalyFilter = "open" | "resolved" | "all";

export interface PaymentAnomaly {
  id: string;
  order_id: string;
  order_number: string;
  order_total: number;
  midtrans_order_id: string;
  kind: PaymentAnomalyKind;
  order_status: OrderStatus;
  transaction_status: string;
  gross_amount: string | null; // string persis dari Midtrans, mis. "150000.00"
  resolution: PaymentAnomalyResolution | null;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface ResolvePaymentAnomalyPayload {
  resolution: PaymentAnomalyResolution;
  note: string | null;
}
