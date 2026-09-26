import { request, USE_FIXTURES, ApiError } from "../http";
import type { Envelope, ListEnvelope } from "../http";
import type { Order, OrderStatus, AdminOrdersQuery } from "./types";
import { fixtures } from "./fixtures";

export async function getOrders(): Promise<Order[]> {
  if (USE_FIXTURES) return fixtures.orders;
  const { data } = await request<Envelope<Order[]>>("/api/v1/orders", { auth: true });
  return data;
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

export async function updateAdminOrderStatus(id: string, status: OrderStatus): Promise<void> {
  await request<Envelope<{ status: string }>>(`/api/v1/admin/orders/${id}/status`, {
    method: "PUT",
    body: { status },
    auth: true,
  });
}
