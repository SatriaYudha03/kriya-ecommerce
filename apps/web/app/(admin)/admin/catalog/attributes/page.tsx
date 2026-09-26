"use client";

import { useAdminAttributes } from "@/lib/catalog/queries";
import { AdminGuard } from "@/components/kriya/admin/admin-guard";
import { SectionHeading } from "@/components/kriya/section-heading";
import { EmptyState } from "@/components/kriya/empty-state";

export default function AttributesPage() {
  const { data, isLoading } = useAdminAttributes();

  return (
    <AdminGuard>
      <div className="p-6">
        <SectionHeading title="Attributes" />
        <div className="mt-6 bg-white rounded-lg border shadow-sm p-4">
          {isLoading ? (
            <p>Loading...</p>
          ) : data && data.length > 0 ? (
            <div className="flex flex-col gap-4">
              {data.map(a => (
                <div key={a.id} className="p-4 border rounded-md">
                  <h3 className="font-semibold">{a.slug} {a.is_filterable && "(Filterable)"}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {a.terms.map(t => (
                      <span key={t.id} className="px-3 py-1 bg-neutral-100 border rounded-full text-sm">
                        {t.slug}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Belum ada atribut" hint="Atribut dapat ditambahkan via API" />
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
