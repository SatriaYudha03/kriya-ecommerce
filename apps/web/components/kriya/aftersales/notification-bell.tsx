"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useUnreadNotificationCount } from "@/lib/aftersales/queries";
import { useAuth } from "@/components/kriya/auth-provider";
import { cn } from "@/lib/utils";

export function NotificationBell({ className }: { className?: string }) {
  const { user } = useAuth();
  const { data: count = 0 } = useUnreadNotificationCount(Boolean(user));

  return (
    <Link
      href="/account/notifications"
      className={cn(
        "relative flex items-center justify-center rounded-md p-2 text-slate-700 hover:bg-slate-100",
        className,
      )}
    >
      <Bell className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
