"use client";

import { useLanguage } from "@/components/kriya/language-provider";
import type { OrderStatus } from "@/lib/aftersales/types";
import { cn } from "@/lib/utils";
import type { MessageKey } from "@/lib/i18n";

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending_payment: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  paid: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  processing: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  shipped: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  completed: "bg-green-100 text-green-800 hover:bg-green-100",
  cancelled: "bg-red-100 text-red-800 hover:bg-red-100",
  expired: "bg-red-100 text-red-800 hover:bg-red-100",
  refunded: "bg-gray-100 text-gray-800 hover:bg-gray-100",
};

export interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const { t } = useLanguage();

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_COLORS[status],
      )}
    >
      {t(`after.status.${status}` as MessageKey)}
    </span>
  );
}
