export interface RecentOrder {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  customer_email: string;
}

export interface AdminStats {
  total_orders: number;
  revenue: number;
  active_products: number;
  today_revenue: number;
  today_orders: number;
  pending_payment_count: number;
  to_ship_count: number;
  low_stock_count: number;
  pending_reviews_count: number;
  open_returns_count: number;
  recent_orders: RecentOrder[];
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

export interface ReportSummary {
  gross_sales: number;
  discount_total: number;
  refunded_total: number;
  net_sales: number;
  shipping_total: number;
  orders_count: number;
  items_sold: number;
  avg_order_value: number;
  new_customers: number;
}

export interface ReportSalesItem {
  period: string;
  orders_count: number;
  gross_sales: number;
  discount_total: number;
  refunded_total: number;
  net_sales: number;
  shipping_total: number;
}

export interface ReportTopProduct {
  product_id: string;
  slug: string;
  name: string;
  items_sold: number;
  revenue: number;
}


export interface ReportStatusCount {
  status: string;
  count: number;
}

export interface ReportCategoryShare {
  slug: string;
  name_i18n: Record<string, string>;
  items_sold: number;
  revenue: number;
}

export interface ReportBreakdown {
  order_status: ReportStatusCount[];
  categories: ReportCategoryShare[];
}
