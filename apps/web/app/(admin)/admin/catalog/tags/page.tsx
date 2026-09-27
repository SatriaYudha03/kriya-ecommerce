"use client";

import { useAdminTags } from "@/lib/catalog/queries";
import { AdminGuard } from "@/components/kriya/admin/admin-guard";
import { SectionHeading } from "@/components/kriya/section-heading";
import { EmptyState } from "@/components/kriya/empty-state";
import { useLanguage } from "@/components/kriya/language-provider";

export default function TagsPage() {
  const { t } = useLanguage();
  const { data, isLoading, isError } = useAdminTags();

  return (
    <AdminGuard>
      <div className="p-6">
        <SectionHeading title={t("adminCatalog.tags.title")} />
        <div className="mt-6 bg-white rounded-lg border shadow-sm p-4">
          {isLoading ? (
            <p>{t("adminCatalog.tags.loading")}</p>
          ) : isError ? (
            <p className="text-red-600">{t("adminCatalog.tags.loading")}</p>
          ) : data && data.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.map(tag => (
                <span key={tag.id} className="px-3 py-1 bg-neutral-100 border rounded-full text-sm">
                  {tag.slug}
                </span>
              ))}
            </div>
          ) : (
            <EmptyState title={t("adminCatalog.tags.empty")} hint={t("adminCatalog.tags.emptyHint")} />
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
