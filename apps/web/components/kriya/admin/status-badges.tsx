"use client";

// Badge status khusus panel admin — satu pemetaan nada per entitas agar status
// yang sama selalu berwarna sama di setiap modul (daftar, detail, dashboard).

import { useLanguage } from "@/components/kriya/language-provider";
import type { OrderStatus, ReturnStatus, ReviewStatus } from "@/lib/aftersales/types";
import type { MessageKey } from "@/lib/i18n";
import { Badge, type BadgeProgress, type BadgeTone } from "./ui";

const ORDER: Record<OrderStatus, { tone: BadgeTone; progress?: BadgeProgress }> = {
  pending_payment: { tone: "attention", progress: "incomplete" },
  paid: { tone: "info", progress: "partial" },
  processing: { tone: "warning", progress: "partial" },
  shipped: { tone: "magic", progress: "partial" },
  completed: { tone: "success", progress: "complete" },
  cancelled: { tone: "neutral" },
  expired: { tone: "neutral" },
  refunded: { tone: "neutral", progress: "complete" },
};

// Status lama dari seed/riwayat dipetakan ke status v2.
const ORDER_ALIAS: Record<string, OrderStatus> = {
  delivered: "completed",
  pending: "pending_payment",
  awaiting_payment: "pending_payment",
};

export function normalizeOrderStatus(status: string): OrderStatus | null {
  const s = ORDER_ALIAS[status] ?? status;
  return s in ORDER ? (s as OrderStatus) : null;
}

export function OrderBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const s = normalizeOrderStatus(status);
  if (!s) return <Badge>{status}</Badge>;
  return (
    <Badge tone={ORDER[s].tone} progress={ORDER[s].progress}>
      {t(`after.status.${s}` as MessageKey)}
    </Badge>
  );
}

const PRODUCT: Record<string, { tone: BadgeTone; key: MessageKey }> = {
  published: { tone: "success", key: "adminCatalog.products.published" },
  draft: { tone: "info", key: "adminCatalog.products.draft" },
  archived: { tone: "neutral", key: "adminCatalog.products.archived" },
};

export function ProductStatusBadge({ status }: { status?: string }) {
  const { t } = useLanguage();
  const p = PRODUCT[status ?? "published"];
  if (!p) return <Badge>{status}</Badge>;
  return <Badge tone={p.tone}>{t(p.key)}</Badge>;
}

const COUPON: Record<string, { tone: BadgeTone; key: MessageKey }> = {
  active: { tone: "success", key: "adminPromo.coupons.statusActive" },
  scheduled: { tone: "info", key: "adminPromo.coupons.statusScheduled" },
  expired: { tone: "neutral", key: "adminPromo.coupons.statusExpired" },
  inactive: { tone: "warning", key: "adminPromo.coupons.statusInactive" },
};

export function CouponStatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const c = COUPON[status];
  if (!c) return <Badge>{status}</Badge>;
  return <Badge tone={c.tone}>{t(c.key)}</Badge>;
}

const RETURN: Record<ReturnStatus, BadgeTone> = {
  requested: "attention",
  approved: "info",
  received: "warning",
  refunded: "success",
  rejected: "critical",
  cancelled: "neutral",
};

export function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  const { t } = useLanguage();
  return <Badge tone={RETURN[status] ?? "neutral"}>{t(`admin.returns.status.${status}` as MessageKey)}</Badge>;
}

const REVIEW: Record<ReviewStatus, { tone: BadgeTone; key: MessageKey }> = {
  pending: { tone: "attention", key: "after.admin.reviews.filterPending" },
  approved: { tone: "success", key: "after.admin.reviews.filterApproved" },
  rejected: { tone: "critical", key: "after.admin.reviews.filterRejected" },
};

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const { t } = useLanguage();
  const r = REVIEW[status];
  return <Badge tone={r.tone}>{t(r.key)}</Badge>;
}
