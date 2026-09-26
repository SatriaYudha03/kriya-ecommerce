// Fetcher terpusat KRIYA. Semua panggilan API lewat sini — tidak ada fetch liar.
// Baca NEXT_PUBLIC_API_URL / NEXT_PUBLIC_AI_URL, sisipkan Bearer bila ada sesi,
// parse envelope {data, meta}, lempar ApiError dari {error}.
// NEXT_PUBLIC_USE_FIXTURES=true mengalihkan ke lib/fixtures.

import { fixtures } from "./fixtures";
import type {
  ApiErrorBody,
  Cart,
  Category,
  Envelope,
  ListEnvelope,
  Order,
  OrderStatus,
  ProductDetail,
  ProductListItem,
  Profile,
  UpdateProfilePayload,
  CreateOrderPayload,
  CreateOrderResponse,
  SearchEnvelope,
  SimilarEnvelope,
  AdminStats,
  AdminOrdersQuery,
  AdminProductDetail,
  AdminProductImage,
  CreateProductPayload,
  UpdateProductPayload,
  VariantInput,
  ProductImageInput,
} from "./types";

import { t, type Locale } from "./i18n";

const USE_FIXTURES = process.env.NEXT_PUBLIC_USE_FIXTURES === "true";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const AI_URL = process.env.NEXT_PUBLIC_AI_URL ?? "";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

// Seam auth: supabase-js mengisi getter ini pada M2. M0 belum ada sesi.
let accessTokenGetter: () => Promise<string | null> = async () => null;
export function setAccessTokenGetter(fn: () => Promise<string | null>) {
  accessTokenGetter = fn;
}

interface FetchOpts {
  base?: "commerce" | "ai";
  method?: string;
  body?: unknown;
  auth?: boolean;
  lang?: string;
}

function getLocaleCookie(): string {
  if (typeof window !== "undefined") {
    const match = document.cookie.match(new RegExp('(^| )kriya-locale=([^;]+)'));
    if (match) return match[2];
  }
  return "id";
}

async function request<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const baseUrl = opts.base === "ai" ? AI_URL : API_URL;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  
  const lang = opts.lang || getLocaleCookie();
  headers["Accept-Language"] = lang;

  if (opts.auth) {
    const token = await accessTokenGetter();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (json as ApiErrorBody | null)?.error;
    throw new ApiError(
      err?.code ?? "internal",
      err?.message ?? t(lang as Locale, "error.unexpected"),
      res.status,
    );
  }
  return json as T;
}

export async function getCategories(): Promise<Category[]> {
  if (USE_FIXTURES) return fixtures.categories;
  const { data } = await request<Envelope<Category[]>>("/api/v1/categories");
  return data;
}

export interface ProductsQuery {
  category?: string;
  q?: string;
  min_price?: number;
  max_price?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
  limit?: number;
}

// Filter/sort/paginasi fixtures agar meniru perilaku endpoint Gin
// (KRIYA-MASTER Bagian 6): sort newest|price_asc|price_desc, meta.total = jumlah
// setelah filter, sebelum slice halaman. Dipakai hanya saat USE_FIXTURES.
function queryFixtures(query: ProductsQuery): ListEnvelope<ProductListItem> {
  let items = [...fixtures.productList];
  if (query.category) items = items.filter((p) => p.category_slug === query.category);
  if (query.q) {
    const q = query.q.toLowerCase();
    items = items.filter((p) => p.name.toLowerCase().includes(q));
  }
  if (query.min_price !== undefined) items = items.filter((p) => p.price_min >= query.min_price!);
  if (query.max_price !== undefined) items = items.filter((p) => p.price_min <= query.max_price!);

  if (query.sort === "price_asc") items.sort((a, b) => a.price_min - b.price_min);
  else if (query.sort === "price_desc") items.sort((a, b) => b.price_min - a.price_min);
  // "newest" (default) = urutan sumber (fixtures sudah newest-first).

  const total = items.length;
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const start = (page - 1) * limit;
  return { data: items.slice(start, start + limit), meta: { page, limit, total } };
}

export async function getProducts(
  query: ProductsQuery = {},
): Promise<ListEnvelope<ProductListItem>> {
  if (USE_FIXTURES) return queryFixtures(query);
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) params.set(k, String(v));
  }
  const qs = params.toString();
  return request<ListEnvelope<ProductListItem>>(`/api/v1/products${qs ? `?${qs}` : ""}`);
}

export async function getProduct(slug: string): Promise<ProductDetail> {
  if (USE_FIXTURES) {
    const detail = fixtures.productDetails[slug];
    if (!detail) throw new ApiError("not_found", "Product not found", 404);
    return detail;
  }
  const { data } = await request<Envelope<ProductDetail>>(`/api/v1/products/${slug}`);
  return data;
}

export async function getProfile(): Promise<Profile> {
  if (USE_FIXTURES) return fixtures.profile;
  const { data } = await request<Envelope<Profile>>("/api/v1/profile", { auth: true });
  return data;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<Profile> {
  if (USE_FIXTURES) {
    return new Promise((resolve) => setTimeout(() => resolve(payload), 400));
  }
  const { data } = await request<Envelope<Profile>>("/api/v1/profile", {
    method: "PUT",
    body: payload,
    auth: true,
  });
  return data;
}

export async function getCart(): Promise<Cart> {
  if (USE_FIXTURES) return fixtures.cart;
  const { data } = await request<Envelope<Cart>>("/api/v1/cart", { auth: true });
  return data;
}

export async function updateCart(items: { variant_id: string; qty: number }[]): Promise<Cart> {
  if (USE_FIXTURES) {
    // In fixture mode, return the static cart but simulate network
    return new Promise(resolve => setTimeout(() => resolve(fixtures.cart), 500));
  }
  const { data } = await request<Envelope<Cart>>("/api/v1/cart", { 
    method: "PUT",
    body: { items },
    auth: true 
  });
  return data;
}

export async function createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
  const { data } = await request<Envelope<CreateOrderResponse>>("/api/v1/orders", {
    method: "POST",
    body: payload,
    auth: true
  });
  return data;
}

export async function getOrders(
  page: number = 1,
  limit: number = 10,
  status?: string
): Promise<ListEnvelope<Order>> {
  if (USE_FIXTURES) return { data: fixtures.orders, meta: { page, limit, total: fixtures.orders.length } };
  
  const query = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  if (status) query.append("status", status);
  
  const res = await request<ListEnvelope<Order>>(`/api/v1/orders?${query.toString()}`, { auth: true });
  return res;
}

export async function getOrder(id: string): Promise<Order> {
  if (USE_FIXTURES) {
    const order = fixtures.orders.find(o => o.id === id);
    if (!order) throw new ApiError("not_found", "Order not found", 404);
    return order;
  }
  const { data } = await request<Envelope<Order>>(`/api/v1/orders/${id}`, { auth: true });
  return data;
}

export async function searchProducts(q: string): Promise<SearchEnvelope> {
  if (USE_FIXTURES) {
    return new Promise(resolve => setTimeout(() => {
      const qLower = q.toLowerCase();
      const hits = fixtures.productList.filter(p => p.name.toLowerCase().includes(qLower));
      resolve({
        data: hits.map(h => ({ ...h, product_id: h.id, score: 1.0 })),
        meta: { mode: "keyword_fallback" }
      });
    }, 500));
  }
  return request<SearchEnvelope>(`/ai/v1/search?q=${encodeURIComponent(q)}`, { base: "ai" });
}

export async function getSimilarProducts(id: string): Promise<SimilarEnvelope> {
  if (USE_FIXTURES) {
    return new Promise(resolve => setTimeout(() => resolve({
      data: fixtures.productList.slice(0, 4).map(h => ({ ...h, product_id: h.id, score: 0.9 }))
    }), 500));
  }
  return request<SimilarEnvelope>(`/ai/v1/products/${id}/similar`, { base: "ai" });
}

// ===== Admin (M6) =====
// Fitur admin hanya berjalan terhadap API live (butuh role admin di server);
// tidak ada mode fixtures di sini.

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await request<Envelope<AdminStats>>("/api/v1/admin/stats", { auth: true });
  return data;
}

export async function getAdminOrders(
  query: AdminOrdersQuery = {},
): Promise<ListEnvelope<Order>> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return request<ListEnvelope<Order>>(`/api/v1/admin/orders${qs ? `?${qs}` : ""}`, { auth: true });
}

export async function updateAdminOrderStatus(id: string, status: OrderStatus): Promise<void> {
  await request<Envelope<{ status: string }>>(`/api/v1/admin/orders/${id}/status`, {
    method: "PUT",
    body: { status },
    auth: true,
  });
}

export async function getAdminProduct(id: string): Promise<AdminProductDetail> {
  const { data } = await request<Envelope<AdminProductDetail>>(`/api/v1/admin/products/${id}`, {
    auth: true,
  });
  return data;
}

export async function createProduct(payload: CreateProductPayload): Promise<{ id: string }> {
  const { data } = await request<Envelope<{ id: string }>>("/api/v1/admin/products", {
    method: "POST",
    body: payload,
    auth: true,
  });
  return data;
}

export async function updateProduct(id: string, payload: UpdateProductPayload): Promise<void> {
  await request<Envelope<{ id: string }>>(`/api/v1/admin/products/${id}`, {
    method: "PUT",
    body: payload,
    auth: true,
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await request<Envelope<{ id: string }>>(`/api/v1/admin/products/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function createVariant(productId: string, payload: VariantInput): Promise<void> {
  await request<Envelope<unknown>>(`/api/v1/admin/products/${productId}/variants`, {
    method: "POST",
    body: payload,
    auth: true,
  });
}

export async function updateVariant(
  productId: string,
  variantId: string,
  payload: VariantInput,
): Promise<void> {
  await request<Envelope<unknown>>(
    `/api/v1/admin/products/${productId}/variants/${variantId}`,
    { method: "PUT", body: payload, auth: true },
  );
}

export async function deleteVariant(productId: string, variantId: string): Promise<void> {
  await request<Envelope<unknown>>(
    `/api/v1/admin/products/${productId}/variants/${variantId}`,
    { method: "DELETE", auth: true },
  );
}

export async function addProductImage(
  productId: string,
  payload: ProductImageInput,
): Promise<AdminProductImage> {
  const { data } = await request<Envelope<AdminProductImage>>(
    `/api/v1/admin/products/${productId}/images`,
    { method: "POST", body: payload, auth: true },
  );
  return data;
}

export async function updateProductImage(
  productId: string,
  imageId: string,
  payload: { alt: string; is_primary: boolean },
): Promise<void> {
  await request<Envelope<{ id: string }>>(
    `/api/v1/admin/products/${productId}/images/${imageId}`,
    { method: "PUT", body: payload, auth: true },
  );
}

export async function deleteProductImage(productId: string, imageId: string): Promise<void> {
  await request<Envelope<{ id: string }>>(
    `/api/v1/admin/products/${productId}/images/${imageId}`,
    { method: "DELETE", auth: true },
  );
}
