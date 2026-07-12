"use client";

import { Truck } from "lucide-react";
import { useLanguage } from "./language-provider";

// Bar pengumuman tipis di atas header (gaya anon). Non-sticky.
export function TopBar() {
  const { t } = useLanguage();
  return (
    <div className="bg-clay text-cream">
      <div className="mx-auto flex h-9 max-w-6xl items-center justify-center gap-2 px-4 text-xs">
        <Truck className="h-3.5 w-3.5" />
        <span>{t("topbar.promo")}</span>
      </div>
    </div>
  );
}
