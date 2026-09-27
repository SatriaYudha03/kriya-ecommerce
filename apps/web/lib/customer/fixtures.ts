import type { Cart, Profile } from "./types";
import { productDetails } from "../catalog/fixtures";

export const cart: Cart = {
  items: [
    {
      variant_id: productDetails["taru-work-desk"].variants[0].id,
      qty: 1,
      price: 1800000,
      stock: 5,
      subtotal: 1800000,
      product: {
        slug: "taru-work-desk",
        name: "TARU work desk",
        thumbnail_url: "https://nmlhpeqpahihfwzbqmzp.supabase.co/storage/v1/object/public/products/taru-work-desk-1.jpg",
        color: "natural",
        size: null,
      },
    },
  ],
  total: 1800000,
};

export const profile: Profile = {
  full_name: "Satria Yudha",
  phone: "081200000000",
  address_line: "Jl. Melati No. 10",
  city: "Bandung",
  province: "Jawa Barat",
  postal_code: "40123",
};

const adminSettings = {
  store_name: "KRIYA",
  support_email: "support@kriya.com",
  support_phone: "0811223344",
  tax_rate_bp: 1100,
  prices_include_tax: true,
  pending_payment_ttl_minutes: 1440,
  return_window_days: 7,
  low_stock_threshold_default: 3,
};

const publicStoreSettings = {
  store_name: "KRIYA",
  support_email: "support@kriya.com",
  support_phone: "0811223344",
  tax_rate_bp: 1100,
  prices_include_tax: true,
  return_window_days: 7,
};

const adminCustomers = (page: number, limit: number) => {
  return {
    data: [
      {
        id: "usr-1",
        email: "satria@example.com",
        full_name: "Satria Yudha",
        phone: "081200000000",
        role: "customer",
        orders_count: 5,
        total_spent: 10500000,
        last_order_at: "2026-09-20T10:00:00Z",
        created_at: "2025-01-01T10:00:00Z"
      }
    ],
    meta: {
      page,
      limit,
      total: 1
    }
  };
};

const adminCustomerDetail = {
  id: "usr-1",
  email: "satria@example.com",
  full_name: "Satria Yudha",
  phone: "081200000000",
  role: "customer",
  orders_count: 5,
  total_spent: 10500000,
  last_order_at: "2026-09-20T10:00:00Z",
  created_at: "2025-01-01T10:00:00Z",
  addresses: [],
  recent_orders: [
    {
      id: "ord-1",
      order_number: "ORD-2609-001",
      status: "completed",
      total: 2100000,
      created_at: "2026-09-20T10:00:00Z"
    }
  ]
};

export const fixtures = {
  cart,
  profile,
  adminSettings,
  publicStoreSettings,
  adminCustomers,
  adminCustomerDetail
};
