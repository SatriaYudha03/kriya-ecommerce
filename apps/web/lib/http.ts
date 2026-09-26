import { t, type Locale } from "./i18n";

export const USE_FIXTURES = process.env.NEXT_PUBLIC_USE_FIXTURES === "true";
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

let accessTokenGetter: () => Promise<string | null> = async () => null;
export function setAccessTokenGetter(fn: () => Promise<string | null>) {
  accessTokenGetter = fn;
}

export interface FetchOpts {
  base?: "commerce" | "ai";
  method?: string;
  body?: unknown;
  auth?: boolean;
  lang?: string;
}

export function getLocaleCookie(): string {
  if (typeof window !== "undefined") {
    const match = document.cookie.match(new RegExp('(^| )kriya-locale=([^;]+)'));
    if (match) return match[2];
  }
  return "id";
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export async function request<T>(path: string, opts: FetchOpts = {}): Promise<T> {
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
