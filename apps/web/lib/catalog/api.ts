import { request, USE_FIXTURES } from "../http";
import type { Envelope, ListEnvelope } from "../http";
import type {
  Category,
  ProductListItem,
  ProductDetail,
  SearchEnvelope,
  SimilarEnvelope,
  AdminProductDetail,
  CreateProductPayload,
  UpdateProductPayload,
  VariantInput,
  ProductImageInput,
  AdminProductImage,
} from "./types";
import { fixtures } from "./fixtures";

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
  return request<ListEnvelope<ProductListItem>>(`/api/v1/products${qs ? "?" + qs : ""}`);
}

export async function getProduct(slug: string): Promise<ProductDetail> {
  if (USE_FIXTURES) {
    const detail = fixtures.productDetails[slug];
    if (!detail) throw new Error("Product not found");
    return detail;
  }
  const { data } = await request<Envelope<ProductDetail>>(`/api/v1/products/${slug}`);
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
