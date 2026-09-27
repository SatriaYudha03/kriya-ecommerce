export interface ShippingAddress {
  recipient: string;
  phone: string;
  address_line: string;
  city: string;
  province: string;
  postal_code: string;
}

export interface Profile {
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  province: string;
  postal_code: string;
}

export type UpdateProfilePayload = Profile;

export interface CartItem {
  variant_id: string;
  qty: number;
  price: number;
  stock: number;
  subtotal: number;
  product: {
    slug: string;
    name: string;
    thumbnail_url: string;
    color: string;
    size: string | null;
  };
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export interface PutCartPayloadItem {
  variant_id: string;
  qty: number;
}

export interface Address {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  address_line: string;
  district: string | null;
  city: string;
  province_code: string;
  province: string;
  postal_code: string;
  notes: string | null;
  is_default: boolean;
  created_at: string;
}

export type AddressInput = Omit<Address, "id" | "province" | "created_at">;

import type { ProductListItem } from "@/lib/types";

export interface Province {
  code: string;
  name: string;
  zone_code: string;
}

export interface Wishlist {
  items: ProductListItem[];
}


export interface ContinuePaymentResponse {
  snap_token: string;
  midtrans_client_key: string;
  expires_at: string;
}

export interface AdminCustomerListItem {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  orders_count: number;
  total_spent: number;
  last_order_at: string | null;
  created_at: string;
}

export interface AdminCustomerListResponse {
  customers: AdminCustomerListItem[];
  total: number;
}

export interface AdminRecentOrder {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
}

export interface AdminCustomerDetailItem {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  orders_count: number;
  total_spent: number;
  last_order_at: string | null;
  created_at: string;
  addresses: Address[];
  recent_orders: AdminRecentOrder[];
}

export interface AdminSettings {
  store_name: string;
  support_email: string | null;
  support_phone: string | null;
  tax_rate_bp: number;
  prices_include_tax: boolean;
  pending_payment_ttl_minutes: number;
  return_window_days: number;
  low_stock_threshold_default: number;
}

export interface PublicStoreSettings {
  store_name: string;
  support_email: string | null;
  support_phone: string | null;
  tax_rate_bp: number;
  prices_include_tax: boolean;
  return_window_days: number;
}

export interface ShippingMethod {
  id: string;
  code: string;
  name_i18n: Record<string, string>;
  rate_type: string;
  base_cost: number;
  per_kg_cost: number;
  max_weight_kg: number | null;
  free_shipping_min_subtotal: number | null;
  eta_min_days: number;
  eta_max_days: number;
  is_active: boolean;
}

export interface ShippingZone {
  id: string;
  code: string;
  name_i18n: Record<string, string>;
  is_active: boolean;
  provinces: string[];
  methods: ShippingMethod[];
}

