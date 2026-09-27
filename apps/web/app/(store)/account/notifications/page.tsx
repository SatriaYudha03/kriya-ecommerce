"use client";

import { useState } from "react";
import { useNotifications, useMarkNotificationsAsRead } from "@/lib/aftersales/queries";
import { useLanguage } from "@/components/kriya/language-provider";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { MessageKey } from "@/lib/i18n";

const formatRelativeTime = (dateStr: string, lang: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return rtf.format(-days, "day");
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return rtf.format(-hours, "hour");
  
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes > 0) return rtf.format(-minutes, "minute");
  
  return rtf.format(0, "second");
};

export default function NotificationsPage() {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data: env, isLoading } = useNotifications(page, unreadOnly);
  const markAsRead = useMarkNotificationsAsRead();

  const handleMarkAllRead = () => {
    markAsRead.mutate({ all: true });
  };

  const handleNotificationClick = (notifId: string, link: string) => {
    markAsRead.mutate({ ids: [notifId] }, {
      onSuccess: () => {
        router.push(link);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">{t("after.notifications.title" as MessageKey)}</h1>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 text-sm">
            <input 
              type="checkbox" 
              checked={unreadOnly} 
              onChange={(e) => {
                setUnreadOnly(e.target.checked);
                setPage(1);
              }}
            />
            {t("after.notifications.unreadOnly" as MessageKey)}
          </label>
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markAsRead.isPending}>
            {t("after.notifications.markAllRead" as MessageKey)}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : env?.data?.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground bg-muted/30 rounded-lg">
          {t("after.notifications.empty" as MessageKey)}
        </div>
      ) : (
        <div className="space-y-3">
          {env?.data?.map((n) => (
            <div 
              key={n.id} 
              onClick={() => handleNotificationClick(n.id, n.link)}
              className={`p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${!n.read_at ? "bg-primary/5 border-primary/20" : "bg-card"}`}
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className={`font-medium ${!n.read_at ? "text-primary" : ""}`}>{n.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{n.body}</p>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatRelativeTime(n.created_at, locale)}
                </div>
              </div>
            </div>
          ))}
          
          {/* Pagination */}
          {env?.meta && env.meta.total > env.meta.limit && (
            <div className="flex justify-center gap-2 pt-4">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                {t("after.common.prev" as MessageKey)}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page * env.meta.limit >= env.meta.total}
                onClick={() => setPage(p => p + 1)}
              >
                {t("after.common.next" as MessageKey)}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
