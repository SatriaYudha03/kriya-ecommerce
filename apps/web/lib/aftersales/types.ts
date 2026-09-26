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
  variant_id: string;
  name: string;
  color: string;
  size: string | null;
  qty: number;
  price: number;
  subtotal: number;
  review_id: string | null;
}

export interface OrderTimeline {
  status: string;
  created_at: string;
  note: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shipping_cost: number;
  total: number;
  shipping_address: ShippingAddress;
  created_at: string;
  payment: {
    can_continue: boolean;
  };
  can_cancel: boolean;
  can_return: boolean;
  timeline: OrderTimeline[];
}

export interface AdminOrdersQuery {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}
