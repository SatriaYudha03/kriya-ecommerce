"use client";

import { useAdminTags } from "@/lib/catalog/queries";
import { AdminGuard } from "@/components/kriya/admin/admin-guard";
import { SectionHeading } from "@/components/kriya/section-heading";
import { EmptyState } from "@/components/kriya/empty-state";

export default function TagsPage() {
  const { data, isLoading } = useAdminTags();

  return (
    <AdminGuard>
      <div className="p-6">
        <SectionHeading title="Tags" />
        <div className="mt-6 bg-white rounded-lg border shadow-sm p-4">
          {isLoading ? (
            <p>Loading...</p>
          ) : data && data.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.map(t => (
                <span key={t.id} className="px-3 py-1 bg-neutral-100 border rounded-full text-sm">
                  {t.slug}
                </span>
              ))}
            </div>
          ) : (
            <EmptyState title="Belum ada tag" hint="Tag dapat ditambahkan via API" />
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
