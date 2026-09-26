export interface AdminStats {
  total_orders: number;
  revenue: number;
  active_products: number;
}

export interface Coupon {
  id: string;
  code: string;
  description_i18n: Record<string, string>;
  discount_type: "percent" | "fixed_cart" | "free_shipping";
  amount: number;
  max_discount: number | null;
  min_subtotal: number;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  usage_limit_per_user: number | null;
  applies_to: "all" | "products" | "categories";
  exclude_sale_items: boolean;
  is_public: boolean;
  is_active: boolean;
  status: "active" | "scheduled" | "expired" | "inactive";
  total_redemptions: number;
  products?: string[];
  categories?: string[];
}

export interface CouponRedemption {
  id: string;
  coupon_id: string;
  order_id: string;
  user_id: string;
  items_discount: number;
  shipping_discount: number;
  status: "reserved" | "applied" | "released";
  created_at: string;
}

export type CouponPayload = Omit<Coupon, "id" | "status" | "total_redemptions">;
