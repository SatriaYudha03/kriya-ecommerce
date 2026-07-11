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

// Data diri + alamat default user (endpoint /api/v1/profile).
// Dipakai untuk prefill checkout agar tidak mengetik ulang alamat.
export interface Profile {
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  province: string;
  postal_code: string;
}

export type UpdateProfilePayload = Profile;

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

export interface SearchMeta {
  mode: "semantic" | "keyword_fallback";
}

export interface SearchResponseItem {
  product_id: string;
  slug: string;
  name: string;
  price_min: number;
  thumbnail_url: string;
  score: number;
}

export interface SearchEnvelope {
  data: SearchResponseItem[];
  meta: SearchMeta;
}

export interface SimilarEnvelope {
  data: SearchResponseItem[];
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

// ===== Admin (M6) =====

export interface AdminStats {
  total_orders: number;
  revenue: number;
  active_products: number;
}

export interface AdminOrdersQuery {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

export interface Dimensions {
  width_cm: number;
  depth_cm: number;
  height_cm: number;
}

export interface VariantInput {
  sku: string;
  color: string;
  size: string | null;
  price: number;
  stock: number;
}

export interface ProductImageInput {
  storage_path: string;
  alt: string;
  is_primary: boolean;
}

export interface CreateProductPayload {
  slug: string;
  name: string;
  category_slug: string;
  description: string;
  materials: string[];
  dimensions: Dimensions;
  weight_kg: number;
  has_assembly_guide: boolean;
  variants: VariantInput[];
  images: ProductImageInput[];
}

// Update produk hanya field level-produk (varian & gambar lewat endpoint terpisah).
export type UpdateProductPayload = Omit<CreateProductPayload, "variants" | "images">;

export interface AdminProductImage {
  id: string;
  storage_path: string;
  url: string;
  alt: string;
  is_primary: boolean;
}

export interface AdminProductDetail {
  id: string;
  slug: string;
  name: string;
  description: string;
  category_slug: string;
  materials: string[];
  dimensions: Dimensions;
  weight_kg: number;
  has_assembly_guide: boolean;
  variants: ProductVariant[];
  images: AdminProductImage[];
}
