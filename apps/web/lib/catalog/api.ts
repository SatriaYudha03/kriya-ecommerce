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
  AdminCategory,
  AdminCategoryInput,
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
  on_sale?: boolean;
  in_stock?: boolean;
  featured?: boolean;
  tags?: string; // comma separated
  attrs?: string; // comma separated "attr.term,attr.term2"
  sort?: "newest" | "price_asc" | "price_desc" | "best_selling" | "rating";
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
  if (query.on_sale) items = items.filter((p) => p.on_sale);

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

export interface AdminProductsQuery {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export async function getAdminProducts(
  query: AdminProductsQuery = {}
): Promise<ListEnvelope<ProductListItem>> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) params.set(k, String(v));
  }
  const qs = params.toString();
  return request<ListEnvelope<ProductListItem>>(`/api/v1/admin/products${qs ? "?" + qs : ""}`, {
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

export async function getAdminCategories(): Promise<AdminCategory[]> {
  const { data } = await request<Envelope<AdminCategory[]>>("/api/v1/admin/categories", {
    auth: true,
  });
  return data;
}

export async function getAdminCategory(id: string): Promise<AdminCategory> {
  const { data } = await request<Envelope<AdminCategory>>(`/api/v1/admin/categories/${id}`, {
    auth: true,
  });
  return data;
}

export async function createCategory(payload: AdminCategoryInput): Promise<{ id: string }> {
  const { data } = await request<Envelope<{ id: string }>>("/api/v1/admin/categories", {
    method: "POST",
    body: payload,
    auth: true,
  });
  return data;
}

export async function updateCategory(id: string, payload: AdminCategoryInput): Promise<void> {
  await request<Envelope<{ id: string }>>(`/api/v1/admin/categories/${id}`, {
    method: "PUT",
    body: payload,
    auth: true,
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await request<Envelope<{ id: string }>>(`/api/v1/admin/categories/${id}`, {
    method: "DELETE",
    auth: true,
  });
}
import type { Tag, Attribute, AdminTag, AdminAttribute, AdminAttributeInput, AdminTagInput, AdminAttributeTermInput } from "./types";

export async function getTags(): Promise<Tag[]> {
  const data = await request<{ data: Tag[] }>("/tags");
  return data.data;
}

export async function getAttributes(category?: string): Promise<Attribute[]> {
  const url = category ? `/attributes?category=${category}` : "/attributes";
  const data = await request<{ data: Attribute[] }>(url);
  return data.data;
}

export async function getAdminTags(): Promise<AdminTag[]> {
  const data = await request<{ data: AdminTag[] }>("/admin/tags");
  return data.data;
}

export async function createTag(payload: AdminTagInput): Promise<{ id: string }> {
  const data = await request<{ data: { id: string } }>("/admin/tags", { method: "POST", body: JSON.stringify(payload) });
  return data.data;
}

export async function updateTag(id: string, payload: AdminTagInput): Promise<{ id: string }> {
  const data = await request<{ data: { id: string } }>(`/admin/tags/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  return data.data;
}

export async function deleteTag(id: string): Promise<{ id: string }> {
  const data = await request<{ data: { id: string } }>(`/admin/tags/${id}`, { method: "DELETE" });
  return data.data;
}

export async function getAdminAttributes(): Promise<AdminAttribute[]> {
  const data = await request<{ data: AdminAttribute[] }>("/admin/attributes");
  return data.data;
}

export async function createAttribute(payload: AdminAttributeInput): Promise<{ id: string }> {
  const data = await request<{ data: { id: string } }>("/admin/attributes", { method: "POST", body: JSON.stringify(payload) });
  return data.data;
}

export async function updateAttribute(id: string, payload: AdminAttributeInput): Promise<{ id: string }> {
  const data = await request<{ data: { id: string } }>(`/admin/attributes/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  return data.data;
}

export async function deleteAttribute(id: string): Promise<{ id: string }> {
  const data = await request<{ data: { id: string } }>(`/admin/attributes/${id}`, { method: "DELETE" });
  return data.data;
}

export async function createAttributeTerm(attrId: string, payload: AdminAttributeTermInput): Promise<{ id: string }> {
  const data = await request<{ data: { id: string } }>(`/admin/attributes/${attrId}/terms`, { method: "POST", body: JSON.stringify(payload) });
  return data.data;
}

export async function updateAttributeTerm(attrId: string, termId: string, payload: AdminAttributeTermInput): Promise<{ id: string }> {
  const data = await request<{ data: { id: string } }>(`/admin/attributes/${attrId}/terms/${termId}`, { method: "PUT", body: JSON.stringify(payload) });
  return data.data;
}

export async function deleteAttributeTerm(attrId: string, termId: string): Promise<{ id: string }> {
  const data = await request<{ data: { id: string } }>(`/admin/attributes/${attrId}/terms/${termId}`, { method: "DELETE" });
  return data.data;
}
