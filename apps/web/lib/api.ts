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
  ProductDetail,
  ProductListItem,
} from "./types";

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
}

async function request<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const baseUrl = opts.base === "ai" ? AI_URL : API_URL;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
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
      err?.message ?? "Terjadi kesalahan tak terduga",
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
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
  limit?: number;
}

export async function getProducts(
  query: ProductsQuery = {},
): Promise<ListEnvelope<ProductListItem>> {
  if (USE_FIXTURES) {
    const items = query.category
      ? fixtures.productList.filter((p) => p.category_slug === query.category)
      : fixtures.productList;
    return { data: items, meta: { ...fixtures.productListMeta, total: items.length } };
  }
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
    if (!detail) throw new ApiError("not_found", "Produk tidak ditemukan", 404);
    return detail;
  }
  const { data } = await request<Envelope<ProductDetail>>(`/api/v1/products/${slug}`);
  return data;
}

export async function getCart(): Promise<Cart> {
  if (USE_FIXTURES) return fixtures.cart;
  const { data } = await request<Envelope<Cart>>("/api/v1/cart", { auth: true });
  return data;
}

export async function getOrders(): Promise<Order[]> {
  if (USE_FIXTURES) return fixtures.orders;
  const { data } = await request<Envelope<Order[]>>("/api/v1/orders", { auth: true });
  return data;
}
