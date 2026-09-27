"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Package } from "lucide-react";
import { useCategories, useAdminProducts, useDeleteProduct } from "@/lib/catalog/queries";
import { formatRupiah } from "@/lib/format";
import { ProductForm } from "@/components/kriya/admin/product-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/kriya/language-provider";

const LIMIT = 20;

export default function AdminProductsPage() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState<{ open: boolean; productId?: string }>({ open: false });
  const { data, isLoading, isError } = useAdminProducts({ page, limit: LIMIT, status, q });
  const { data: categories } = useCategories();
  const del = useDeleteProduct();

  const catName = useMemo(() => {
    const m = new Map<string, string>();
    categories?.forEach((c) => m.set(c.slug, c.name));
    return m;
  }, [categories]);

  const products = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  function handleDelete(id: string, name: string) {
    if (confirm(t("adminCatalog.products.deleteConfirm", { name }))) {
      del.mutate(id);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t("adminCatalog.products.title")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("adminCatalog.products.count", { total })}</p>
        </div>
        <button
          onClick={() => setForm({ open: true, productId: undefined })}
          className="flex items-center gap-2 rounded-lg bg-brand-strong px-4 py-2 text-sm font-medium text-white hover:bg-brand"
        >
          <Plus className="h-4 w-4" /> {t("adminCatalog.products.add")}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        <div className="w-full max-w-sm">
          <Input 
            placeholder={t("adminCatalog.products.search")} 
            value={q} 
            onChange={(e) => { setQ(e.target.value); setPage(1); }} 
            aria-label={t("adminCatalog.products.search")}
          />
        </div>
        <div className="w-full max-w-xs">
          <Select value={status} onValueChange={(val) => { setStatus(val === "all" ? "" : String(val)); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder={t("adminCatalog.products.allStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("adminCatalog.products.allStatus")}</SelectItem>
              <SelectItem value="draft">{t("adminCatalog.products.draft")}</SelectItem>
              <SelectItem value="published">{t("adminCatalog.products.published")}</SelectItem>
              <SelectItem value="archived">{t("adminCatalog.products.archived")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin" /> {t("adminCatalog.products.loading")}
          </div>
        ) : isError ? (
          <div className="py-20 text-center text-sm text-red-600">{t("adminCatalog.products.error")}</div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-neutral-500">
            <Package className="h-8 w-8" />
            <p className="text-sm">{t("adminCatalog.products.empty")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <Th>{t("adminCatalog.products.thProduct")}</Th>
                    <Th>{t("adminCatalog.products.thCategory")}</Th>
                    <Th>{t("adminCatalog.products.thStatus")}</Th>
                    <Th>{t("adminCatalog.products.thPrice")}</Th>
                    <Th className="text-right">{t("adminCatalog.products.thActions")}</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 bg-white">
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-neutral-900">{p.name}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                        {catName.get(p.category_slug) ?? p.category_slug}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500 capitalize">{p.status}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-900">{formatRupiah(p.price_min)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-3">
                        <button
                          onClick={() => setForm({ open: true, productId: p.id })}
                          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-strong"
                        >
                          <Pencil className="h-4 w-4" /> {t("adminCatalog.products.edit")}
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          disabled={del.isPending && del.variables === p.id}
                          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" /> {t("adminCatalog.products.delete")}
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

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-neutral-300 px-4 py-2 disabled:opacity-40"
          >
            {t("adminCatalog.products.prev")}
          </button>
          <span className="text-neutral-500">
            {t("adminCatalog.products.pageInfo", { page, totalPages })}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-neutral-300 px-4 py-2 disabled:opacity-40"
          >
            {t("adminCatalog.products.next")}
          </button>
        </div>
      )}

      {form.open && (
        <ProductForm productId={form.productId} onClose={() => setForm({ open: false })} />
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
