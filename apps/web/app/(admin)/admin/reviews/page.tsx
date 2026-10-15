"use client";

import { MessageSquare } from "lucide-react";
import { AdminReviews } from "@/components/kriya/aftersales/admin-reviews";
import { useLanguage } from "@/components/kriya/language-provider";
import { Page, PageHeader } from "@/components/kriya/admin/ui";

export default function AdminReviewsPage() {
  const { t } = useLanguage();
  return (
    <Page width="wide">
      <PageHeader icon={MessageSquare} title={t("after.admin.reviews.title")} subtitle={t("after.admin.reviews.subtitle")} />
      <AdminReviews />
    </Page>
  );
}
