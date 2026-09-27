"use client";

import { useAdminAttributes } from "@/lib/catalog/queries";
import { AdminGuard } from "@/components/kriya/admin/admin-guard";
import { SectionHeading } from "@/components/kriya/section-heading";
import { EmptyState } from "@/components/kriya/empty-state";
import { useLanguage } from "@/components/kriya/language-provider";

export default function AttributesPage() {
  const { t } = useLanguage();
  const { data, isLoading, isError } = useAdminAttributes();

  return (
    <AdminGuard>
      <div className="p-6">
        <SectionHeading title={t("adminCatalog.attributes.title")} />
        <div className="mt-6 bg-white rounded-lg border shadow-sm p-4">
          {isLoading ? (
            <p>{t("adminCatalog.attributes.loading")}</p>
          ) : isError ? (
            <p className="text-red-600">{t("adminCatalog.attributes.loading")}</p>
          ) : data && data.length > 0 ? (
            <div className="flex flex-col gap-4">
              {data.map(a => (
                <div key={a.id} className="p-4 border rounded-md">
                  <h3 className="font-semibold">{a.slug} {a.is_filterable && t("adminCatalog.attributes.filterable")}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {a.terms.map(term => (
                      <span key={term.id} className="px-3 py-1 bg-neutral-100 border rounded-full text-sm">
                        {term.slug}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title={t("adminCatalog.attributes.empty")} hint={t("adminCatalog.attributes.emptyHint")} />
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
