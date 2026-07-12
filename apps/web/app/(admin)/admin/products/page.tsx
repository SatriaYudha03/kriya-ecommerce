"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Package } from "lucide-react";
import { useProducts, useCategories } from "@/lib/queries";
import { useDeleteProduct } from "@/lib/admin-queries";
import { formatRupiah } from "@/lib/format";
import { ProductForm } from "@/components/kriya/admin/product-form";

const LIMIT = 20;

export default function AdminProductsPage() {
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ open: boolean; productId?: string }>({ open: false });
  const { data, isLoading, isError } = useProducts({ page, limit: LIMIT });
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
    if (confirm(`Hapus produk "${name}"? Tindakan ini tidak bisa dibatalkan.`)) {
      del.mutate(id);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Manajemen Produk</h1>
          <p className="mt-1 text-sm text-neutral-500">{total} produk</p>
        </div>
        <button
          onClick={() => setForm({ open: true, productId: undefined })}
          className="flex items-center gap-2 rounded-lg bg-brand-strong px-4 py-2 text-sm font-medium text-white hover:bg-brand"
        >
          <Plus className="h-4 w-4" /> Tambah Produk
        </button>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Memuat produk…
          </div>
        ) : isError ? (
          <div className="py-20 text-center text-sm text-red-600">Gagal memuat produk.</div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-neutral-500">
            <Package className="h-8 w-8" />
            <p className="text-sm">Belum ada produk.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <Th>Produk</Th>
                  <Th>Kategori</Th>
                  <Th>Harga (min)</Th>
                  <Th className="text-right">Aksi</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-neutral-900">{p.name}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                      {catName.get(p.category_slug) ?? p.category_slug}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-900">{formatRupiah(p.price_min)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-3">
                        <button
                          onClick={() => setForm({ open: true, productId: p.id })}
                          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-strong"
                        >
                          <Pencil className="h-4 w-4" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          disabled={del.isPending && del.variables === p.id}
                          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" /> Hapus
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
            Sebelumnya
          </button>
          <span className="text-neutral-500">
            Halaman {page} dari {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-neutral-300 px-4 py-2 disabled:opacity-40"
          >
            Berikutnya
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
