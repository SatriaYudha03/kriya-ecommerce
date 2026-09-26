import { request } from "../http";
import type { Envelope } from "../http";
import type { CreateOrderPayload, CreateOrderResponse } from "./types";

export async function createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
  const { data } = await request<Envelope<CreateOrderResponse>>("/api/v1/orders", {
    method: "POST",
    body: payload,
    auth: true,
  });
  return data;
}
