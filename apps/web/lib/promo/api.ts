import { request } from "../http";
import type { Envelope } from "../http";
import type { AdminStats } from "./types";

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await request<Envelope<AdminStats>>("/api/v1/admin/stats", { auth: true });
  return data;
}
