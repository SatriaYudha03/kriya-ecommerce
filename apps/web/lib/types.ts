// Tipe kontrak API KRIYA (snake_case, sesuai KRIYA-MASTER.md Bagian 6).
// FE tidak boleh menyimpang dari bentuk ini.

export interface Category {
  id: string;
  slug: string;
  name: string;
}

export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  category_slug: string;
  price_min: number;
  thumbnail_url: string;
}

export interface ProductImage {
  url: string;
  alt: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  color: string;
  size: string | null;
  price: number;
  stock: number;
}

export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: { slug: string; name: string };
  materials: string[];
  dimensions: { width_cm: number; depth_cm: number; height_cm: number };
  weight_kg: number;
  images: ProductImage[];
  variants: ProductVariant[];
  has_assembly_guide: boolean;
}

export interface CartItem {
  variant_id: string;
  qty: number;
  price: number;
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

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled"
  | "expired";

export interface ShippingAddress {
  recipient: string;
  phone: string;
  address_line: string;
  city: string;
  province: string;
  postal_code: string;
}

export interface OrderItem {
  name: string;
  color: string;
  size: string | null;
  qty: number;
  price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shipping_cost: number;
  total: number;
  shipping_address: ShippingAddress;
  created_at: string;
}

// Envelope respons (KRIYA-MASTER.md Bagian 5).
export interface Envelope<T> {
  data: T;
}

export interface ListMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ListEnvelope<T> {
  data: T[];
  meta: ListMeta;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export interface PutCartPayloadItem {
  variant_id: string;
  qty: number;
}

export interface CreateOrderPayload {
  items: PutCartPayloadItem[];
  shipping_zone: "jawa_bali" | "luar";
  shipping_address: ShippingAddress;
}

export interface CreateOrderResponse {
  order: Order;
  snap_token: string;
  midtrans_client_key: string;
}
