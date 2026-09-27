import type { ShippingAddress } from "../customer/types";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled"
  | "expired"
  | "refunded";

export interface OrderItem {
  id: string;
  variant_id: string;
  product_slug: string;
  thumbnail_url: string;
  name: string;
  sku: string | null;
  color: string;
  size: string | null;
  qty: number;
  price: number;
  regular_price: number;
  discount_amount: number;
  subtotal: number;
  refunded_qty: number;
  can_review: boolean;
  review_id: string | null;
}

export interface OrderTimeline {
  status: string;
  created_at: string;
  note: string | null;
}

export interface ShippingMethod {
  code: string;
  name: string;
  eta_min_days: number;
  eta_max_days: number;
}

export interface PaymentInfo {
  status: string;
  can_continue: boolean;
  expires_at: string | null;
}

export interface OrderNote {
  id: string;
  body: string;
  is_customer_visible: boolean;
  created_at: string;
  author_name: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount_total: number;
  shipping_cost: number;
  shipping_discount: number;
  tax_amount: number;
  total: number;
  coupon_code: string | null;
  shipping_method: ShippingMethod | null;
  shipping_address: ShippingAddress;
  customer_note: string | null;
  courier: string | null;
  tracking_number: string | null;
  payment: PaymentInfo;
  can_cancel: boolean;
  can_return: boolean;
  refundable_amount?: number;
  paid_at: string | null;
  shipped_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  timeline: OrderTimeline[];
  notes?: OrderNote[];
}

export interface AdminOrdersQuery {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  order_item_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: ReviewStatus;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
  
  user_name?: string;
  product_name?: string;
  product_slug?: string;
  variant_name?: string;
}

export interface ReviewSummary {
  average_rating: number;
  total_reviews: number;
  rating_counts: Record<string, number>;
}

export interface CreateReviewRequest {
  order_item_id: string;
  rating: number;
  title?: string;
  body?: string;
}

export interface UpdateReviewRequest {
  rating: number;
  title?: string;
  body?: string;
}

export interface AdminUpdateReviewRequest {
  status?: ReviewStatus;
  admin_reply?: string;
}
export type ReturnStatus = "requested" | "approved" | "rejected" | "received" | "refunded" | "cancelled";
export type ReturnReasonCode = "damaged" | "wrong_item" | "not_as_described" | "missing_parts" | "changed_mind" | "other";

export interface ReturnRequestItem {
  order_item_id: string;
  qty: number;
  product_name: string;
  product_slug: string;
  thumbnail_url: string;
}

export interface ReturnRequest {
  id: string;
  order_id: string;
  order_number?: string;
  status: ReturnStatus;
  reason_code: ReturnReasonCode;
  description: string | null;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  items: ReturnRequestItem[];
}

export interface CreateReturnRequestItem {
  order_item_id: string;
  qty: number;
}

export interface CreateReturnRequest {
  reason_code: ReturnReasonCode;
  description?: string;
  items: CreateReturnRequestItem[];
}

export interface AdminUpdateReturnStatusRequest {
  status: ReturnStatus;
  admin_note?: string;
}

export interface RefundItem {
  order_item_id: string;
  qty: number;
  amount: number;
}

export interface Refund {
  id: string;
  order_id: string;
  amount: number;
  shipping_amount: number;
  restock: boolean;
  created_at: string;
  items: RefundItem[];
}

export interface CreateRefundRequestItem {
  order_item_id: string;
  qty: number;
}

export interface CreateRefundRequest {
  items: CreateRefundRequestItem[];
  restock: boolean;
  return_id?: string;
  note?: string;
}

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  read_at: string | null;
  created_at: string;
};

export type StoreInfo = {
  name: string;
  address: string;
  phone: string;
  email: string;
};
