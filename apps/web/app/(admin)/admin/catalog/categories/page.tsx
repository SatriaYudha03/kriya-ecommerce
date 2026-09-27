"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Loader2, ListTree } from "lucide-react";
import { useAdminCategories, useDeleteCategory } from "@/lib/catalog/queries";
import { CategoryForm } from "@/components/kriya/catalog/category-form";
import { useLanguage } from "@/components/kriya/language-provider";

export default function AdminCategoriesPage() {
  const { t } = useLanguage();
  const [form, setForm] = useState<{ open: boolean; categoryId?: string }>({ open: false });
  const { data: categories, isLoading, isError } = useAdminCategories();
  const del = useDeleteCategory();

  function handleDelete(id: string, name: string) {
    if (confirm(t("adminCatalog.categories.deleteConfirm", { name }))) {
      del.mutate(id);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t("adminCatalog.categories.title")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("adminCatalog.categories.subtitle")}</p>
        </div>
        <button
          onClick={() => setForm({ open: true, categoryId: undefined })}
          className="flex items-center gap-2 rounded-lg bg-brand-strong px-4 py-2 text-sm font-medium text-white hover:bg-brand"
          aria-label={t("adminCatalog.categories.add")}
        >
          <Plus className="h-4 w-4" /> {t("adminCatalog.categories.add")}
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin" /> {t("adminCatalog.categories.loading")}
          </div>
        ) : isError ? (
          <div className="py-20 text-center text-sm text-red-600">{t("adminCatalog.categories.error")}</div>
        ) : categories?.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-neutral-500">
            <ListTree className="h-8 w-8" />
            <p className="text-sm">{t("adminCatalog.categories.empty")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <Th>{t("adminCatalog.categories.thCategory")}</Th>
                    <Th>{t("adminCatalog.categories.thSlug")}</Th>
                    <Th>{t("adminCatalog.categories.thPosition")}</Th>
                    <Th>{t("adminCatalog.categories.thStatus")}</Th>
                    <Th className="text-right">{t("adminCatalog.categories.thActions")}</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 bg-white">
                  {categories?.map((c) => (
                    <tr key={c.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-neutral-900">
                        {c.parent_id ? <span className="text-neutral-400 mr-2">&mdash;</span> : null}
                        {c.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">{c.slug}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">{c.position}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                        {c.is_active ? (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">{t("adminCatalog.categories.active")}</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-neutral-50 px-2 py-1 text-xs font-medium text-neutral-600 ring-1 ring-inset ring-neutral-500/10">{t("adminCatalog.categories.inactive")}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-3">
                          <button
                            onClick={() => setForm({ open: true, categoryId: c.id })}
                            className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-strong"
                            aria-label={t("adminCatalog.categories.edit")}
                          >
                            <Pencil className="h-4 w-4" /> {t("adminCatalog.categories.edit")}
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, c.name)}
                            disabled={del.isPending && del.variables === c.id}
                            className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-red-600 disabled:opacity-50"
                            aria-label={t("adminCatalog.categories.delete")}
                          >
                            <Trash2 className="h-4 w-4" /> {t("adminCatalog.categories.delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form.open && (
        <CategoryForm categoryId={form.categoryId} onClose={() => setForm({ open: false })} />
      )}
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 ${className}`}
    >
      {children}
    </th>
  );
}
