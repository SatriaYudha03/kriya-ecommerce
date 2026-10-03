import type {
  CheckoutQuote,
  CheckoutQuoteRequest,
  CreateOrderPayload,
  CreateOrderResponse,
  PaymentAnomaly,
  PaymentAnomalyFilter,
  QuoteLine,
  ResolvePaymentAnomalyPayload,
} from "./types";
import type { ListEnvelope } from "../http";
import { cart as fixtureCart } from "../customer/fixtures";

const SHIPPING_OPTIONS = [
  { method_id: "ship-reg", code: "reguler", name: "Reguler", cost: 20000, is_free: false, eta_min_days: 3, eta_max_days: 5 },
  { method_id: "ship-express", code: "express", name: "Express", cost: 45000, is_free: false, eta_min_days: 1, eta_max_days: 2 },
];

function buildLines(items: CheckoutQuoteRequest["items"]): QuoteLine[] {
  if (items.length === 0) return [];
  return items.map((item) => {
    const known = fixtureCart.items.find((i) => i.variant_id === item.variant_id);
    const unitPrice = known?.price ?? 1800000;
    return {
      variant_id: item.variant_id,
      product_slug: known?.product.slug ?? "tamu-sofa",
      name: known?.product.name ?? "TAMU sofa",
      color: known?.product.color ?? "natural",
      size: known?.product.size ?? null,
      thumbnail_url: known?.product.thumbnail_url ?? "",
      qty: item.qty,
      unit_price: unitPrice,
      regular_price: unitPrice,
      discount_amount: 0,
      subtotal: unitPrice * item.qty,
    };
  });
}

export function quote(req: CheckoutQuoteRequest): CheckoutQuote {
  const lines = buildLines(req.items);
  const subtotal = lines.reduce((acc, l) => acc + l.subtotal, 0);
  const hasDestination = Boolean(req.address_id || req.province_code);
  const shippingOptions = hasDestination ? SHIPPING_OPTIONS : [];
  const selectedMethod =
    shippingOptions.find((o) => o.method_id === req.shipping_method_id) ?? shippingOptions[0] ?? null;
  const shippingCost = selectedMethod ? selectedMethod.cost : 0;
  const discountTotal = 0;
  const taxAmount = 0;
  return {
    lines,
    subtotal,
    discount_total: discountTotal,
    shipping_options: shippingOptions,
    selected_shipping_method_id: selectedMethod?.method_id ?? null,
    shipping_cost: shippingCost,
    shipping_discount: 0,
    tax_amount: taxAmount,
    total: subtotal - discountTotal + shippingCost,
    total_weight_kg: lines.reduce((acc, l) => acc + l.qty, 0) * 8,
    coupon: req.coupon_code ? { code: req.coupon_code, valid: false, reason: "not_found", discount_type: "" } : null,
    problems: [],
  };
}

export function createOrderResponse(payload: CreateOrderPayload): CreateOrderResponse {
  const q = quote({
    items: payload.items,
    address_id: payload.address_id,
    province_code: null,
    shipping_method_id: payload.shipping_method_id,
    coupon_code: payload.coupon_code,
  });
  return {
    order: {
      id: "fixture-order-1",
      order_number: "KRIYA-FIXTURE1",
      status: "pending_payment",
      items: q.lines.map((l, idx) => ({
        id: `fixture-item-${idx}`,
        variant_id: l.variant_id,
        product_slug: l.product_slug,
        thumbnail_url: l.thumbnail_url,
        name: l.name,
        sku: null,
        color: l.color,
        size: l.size,
        qty: l.qty,
        price: l.unit_price,
        regular_price: l.regular_price,
        discount_amount: l.discount_amount,
        subtotal: l.subtotal,
        refunded_qty: 0,
        can_review: false,
        review_id: null,
      })),
      subtotal: q.subtotal,
      discount_total: q.discount_total,
      shipping_cost: q.shipping_cost,
      shipping_discount: q.shipping_discount,
      tax_amount: q.tax_amount,
      total: q.total,
      coupon_code: payload.coupon_code,
      shipping_method: null,
      shipping_address: {
        recipient: "",
        phone: "",
        address_line: "",
        city: "",
        province: "",
        postal_code: "",
      },
      customer_note: payload.customer_note,
      courier: null,
      tracking_number: null,
      payment: { status: "pending", can_continue: true, expires_at: null },
      can_cancel: true,
      can_return: false,
      paid_at: null,
      shipped_at: null,
      completed_at: null,
      cancelled_at: null,
      created_at: new Date().toISOString(),
      timeline: [],
    },
    snap_token: "fixture-snap-token",
    midtrans_client_key: "SB-Mid-client-fixture",
  };
}

// Mode fixtures: satu anomali contoh (pembayaran VA masuk setelah pesanan dibatalkan).
const anomalyStore: PaymentAnomaly[] = [
  {
    id: "anomaly-1",
    order_id: "order-3",
    order_number: "KRY-261003-000042",
    order_total: 2450000,
    midtrans_order_id: "KRIYA-7QX2M9KD",
    kind: "paid_after_close",
    order_status: "cancelled",
    transaction_status: "settlement",
    gross_amount: "2450000.00",
    resolution: null,
    resolution_note: null,
    resolved_by: null,
    resolved_at: null,
    created_at: "2026-10-03T03:12:00Z",
  },
];

function paymentAnomalies(status: PaymentAnomalyFilter, page: number, limit: number): ListEnvelope<PaymentAnomaly> {
  const rows = anomalyStore.filter((a) =>
    status === "all" ? true : status === "open" ? a.resolved_at === null : a.resolved_at !== null,
  );
  return { data: rows.slice((page - 1) * limit, page * limit), meta: { page, limit, total: rows.length } };
}

function resolvePaymentAnomaly(id: string, payload: ResolvePaymentAnomalyPayload): PaymentAnomaly {
  const row = anomalyStore.find((a) => a.id === id);
  if (!row) throw new Error("Anomali tidak ditemukan");
  row.resolution = payload.resolution;
  row.resolution_note = payload.note;
  row.resolved_by = "fixture-admin";
  row.resolved_at = new Date().toISOString();
  return { ...row };
}

export const fixtures = { quote, createOrderResponse, paymentAnomalies, resolvePaymentAnomaly };
