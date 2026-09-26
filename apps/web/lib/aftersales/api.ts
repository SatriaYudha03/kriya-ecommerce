import { request, USE_FIXTURES, ApiError } from "../http";
import type { Envelope, ListEnvelope } from "../http";
import type { Order, OrderItem, OrderStatus, AdminOrdersQuery, Review, ReviewSummary, CreateReviewRequest, UpdateReviewRequest, AdminUpdateReviewRequest, ReviewStatus } from "./types";
import { fixtures } from "./fixtures";

export async function getOrders(
  page: number = 1,
  limit: number = 10,
  status?: string,
): Promise<ListEnvelope<Order>> {
  if (USE_FIXTURES) {
    return { data: fixtures.orders, meta: { page, limit, total: fixtures.orders.length } };
  }
  const query = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  if (status) query.append("status", status);
  return request<ListEnvelope<Order>>(`/api/v1/orders?${query.toString()}`, { auth: true });
}

export async function getOrder(id: string): Promise<Order> {
  if (USE_FIXTURES) {
    const order = fixtures.orders.find((o) => o.id === id);
    if (!order) throw new ApiError("not_found", "Order not found", 404);
    return order;
  }
  const { data } = await request<Envelope<Order>>(`/api/v1/orders/${id}`, { auth: true });
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
  return request<ListEnvelope<Order>>(`/api/v1/admin/orders${qs ? "?" + qs : ""}`, { auth: true });
}

export async function getAdminOrder(id: string): Promise<Order> {
  const { data } = await request<Envelope<Order>>(`/api/v1/admin/orders/${id}`, { auth: true });
  return data;
}

export async function updateAdminOrderStatus(
  id: string,
  status: OrderStatus,
  note?: string,
  courier?: string,
  tracking_number?: string,
  cancel_reason?: string,
): Promise<void> {
  await request<Envelope<{ status: string }>>(`/api/v1/admin/orders/${id}/status`, {
    method: "PUT",
    body: { status, note, courier, tracking_number, cancel_reason },
    auth: true,
  });
}

export async function addAdminOrderNote(
  id: string,
  body: string,
  is_customer_visible: boolean,
): Promise<void> {
  await request<Envelope<{ status: string }>>(`/api/v1/admin/orders/${id}/notes`, {
    method: "POST",
    body: { body, is_customer_visible },
    auth: true,
  });
}

export async function cancelOrder(id: string, reason: string): Promise<void> {
  await request<Envelope<{ status: string }>>(`/api/v1/orders/${id}/cancel`, {
    method: "POST",
    body: { reason },
    auth: true,
  });
}

// Reviews

export async function getProductReviews(
  slug: string,
  status: string = "approved",
  page: number = 1,
  limit: number = 10,
): Promise<ListEnvelope<Review>> {
  const query = new URLSearchParams({ page: page.toString(), limit: limit.toString(), status });
  return request<ListEnvelope<Review>>(`/api/v1/products/${slug}/reviews?${query.toString()}`);
}

export async function getProductReviewSummary(slug: string): Promise<ReviewSummary> {
  const { data } = await request<Envelope<ReviewSummary>>(`/api/v1/products/${slug}/reviews/summary`);
  return data;
}

export async function getMyReviewables(page: number = 1, limit: number = 10): Promise<ListEnvelope<OrderItem>> {
  const query = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  return request<ListEnvelope<OrderItem>>(`/api/v1/me/reviewables?${query.toString()}`, { auth: true });
}

export async function getMyReviews(page: number = 1, limit: number = 10): Promise<ListEnvelope<Review>> {
  const query = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  return request<ListEnvelope<Review>>(`/api/v1/me/reviews?${query.toString()}`, { auth: true });
}

export async function createReview(req: CreateReviewRequest): Promise<Review> {
  const { data } = await request<Envelope<Review>>(`/api/v1/reviews`, {
    method: "POST",
    body: req,
    auth: true,
  });
  return data;
}

export async function updateReview(id: string, req: UpdateReviewRequest): Promise<Review> {
  const { data } = await request<Envelope<Review>>(`/api/v1/reviews/${id}`, {
    method: "PUT",
    body: req,
    auth: true,
  });
  return data;
}

export async function getAdminReviews(status?: ReviewStatus, page: number = 1, limit: number = 20): Promise<ListEnvelope<Review>> {
  const query = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  if (status) query.append("status", status);
  return request<ListEnvelope<Review>>(`/api/v1/admin/reviews?${query.toString()}`, { auth: true });
}

export async function updateAdminReview(id: string, req: AdminUpdateReviewRequest): Promise<Review> {
  const { data } = await request<Envelope<Review>>(`/api/v1/admin/reviews/${id}`, {
    method: "PUT",
    body: req,
    auth: true,
  });
  return data;
}
