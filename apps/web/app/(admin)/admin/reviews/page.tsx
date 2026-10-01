"use client";

import { AdminReviews } from "@/components/kriya/aftersales/admin-reviews";
import { useLanguage } from "@/components/kriya/language-provider";

export default function AdminReviewsPage() {
  const { t } = useLanguage();
  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("after.admin.reviews.title")}</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {t("after.admin.reviews.subtitle")}
        </p>
      </div>
      <AdminReviews />
    </div>
  );
}
