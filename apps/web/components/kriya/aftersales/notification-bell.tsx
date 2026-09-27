"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useUnreadNotificationCount } from "@/lib/aftersales/queries";

export function NotificationBell() {
  const { data: count = 0 } = useUnreadNotificationCount();

  return (
    <Link href="/account/notifications" className="relative p-2 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-700">
      <Bell className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
