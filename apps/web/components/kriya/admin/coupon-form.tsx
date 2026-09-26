"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useAdminCoupon, useSaveCoupon } from "@/lib/admin-queries";
import type { CouponPayload } from "@/lib/types";

export function CouponForm({ couponId, onClose }: { couponId?: string; onClose: () => void }) {
  const { data: coupon, isLoading } = useAdminCoupon(couponId || "", !!couponId);
  const save = useSaveCoupon();

  const [seeded, setSeeded] = useState(false);
  const [form, setForm] = useState<CouponPayload>({
    code: "",
    description_i18n: { id: "", en: "" },
    discount_type: "percent",
    amount: 0,
    max_discount: null,
    min_subtotal: 0,
    starts_at: null,
    ends_at: null,
    usage_limit: null,
    usage_limit_per_user: null,
    applies_to: "all",
    exclude_sale_items: false,
    is_public: false,
    is_active: true,
    products: [],
    categories: [],
  });

  if (coupon && !seeded) {
    setSeeded(true);
    setForm({
      code: coupon.code,
      description_i18n: coupon.description_i18n,
      discount_type: coupon.discount_type,
      amount: coupon.amount,
      max_discount: coupon.max_discount,
      min_subtotal: coupon.min_subtotal,
      starts_at: coupon.starts_at,
      ends_at: coupon.ends_at,
      usage_limit: coupon.usage_limit,
      usage_limit_per_user: coupon.usage_limit_per_user,
      applies_to: coupon.applies_to,
      exclude_sale_items: coupon.exclude_sale_items,
      is_public: coupon.is_public,
      is_active: coupon.is_active,
      products: coupon.products || [],
      categories: coupon.categories || [],
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate(
      { id: couponId, payload: form },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-lg font-bold text-neutral-900">
            {couponId ? "Edit Kupon" : "Kupon Baru"}
          </h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
            </div>
          ) : (
            <form id="coupon-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700">Kode Kupon</label>
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                    placeholder="Contoh: KRIYA2026"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700">Status</label>
                  <label className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="rounded border-neutral-300 text-brand focus:ring-brand"
                    />
                    <span className="text-sm">Kupon Aktif</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-neutral-700">Deskripsi (ID)</label>
                <input
                  type="text"
                  required
                  value={form.description_i18n.id || ""}
                  onChange={(e) =>
                    setForm({ ...form, description_i18n: { ...form.description_i18n, id: e.target.value } })
                  }
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-neutral-700">Deskripsi (EN)</label>
                <input
                  type="text"
                  required
                  value={form.description_i18n.en || ""}
                  onChange={(e) =>
                    setForm({ ...form, description_i18n: { ...form.description_i18n, en: e.target.value } })
                  }
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700">Tipe Diskon</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) =>
                      setForm({ ...form, discount_type: e.target.value as CouponPayload["discount_type"], amount: 0 })
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="percent">Persentase (%)</option>
                    <option value="fixed_cart">Nominal Rupiah</option>
                    <option value="free_shipping">Gratis Ongkir</option>
                  </select>
                </div>
                {form.discount_type !== "free_shipping" && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-neutral-700">
                      Jumlah ({form.discount_type === "percent" ? "%" : "Rp"})
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={form.discount_type === "percent" ? 100 : undefined}
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700">Minimal Belanja (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.min_subtotal}
                    onChange={(e) =>
                      setForm({ ...form, min_subtotal: parseInt(e.target.value) || 0 })
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700">Maksimal Diskon (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.max_discount || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        max_discount: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Kosongkan jika tidak ada batas"
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700">Mulai Berlaku</label>
                  <input
                    type="datetime-local"
                    value={form.starts_at ? new Date(form.starts_at).toISOString().slice(0, 16) : ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        starts_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700">Berakhir Pada</label>
                  <input
                    type="datetime-local"
                    value={form.ends_at ? new Date(form.ends_at).toISOString().slice(0, 16) : ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ends_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700">Limit Pemakaian (Total)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.usage_limit || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        usage_limit: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Tak terbatas"
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700">Limit per User</label>
                  <input
                    type="number"
                    min={1}
                    value={form.usage_limit_per_user || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        usage_limit_per_user: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Tak terbatas"
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-neutral-700">Berlaku Untuk</label>
                <select
                  value={form.applies_to}
                  onChange={(e) => setForm({ ...form, applies_to: e.target.value as CouponPayload["applies_to"] })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="all">Semua Produk</option>
                  <option value="products">Produk Tertentu</option>
                  <option value="categories">Kategori Tertentu</option>
                </select>
              </div>

              {form.applies_to === "products" && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700">ID Produk (Pisahkan koma)</label>
                  <input
                    type="text"
                    value={form.products?.join(", ") || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        products: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              )}

              {form.applies_to === "categories" && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700">ID Kategori (Pisahkan koma)</label>
                  <input
                    type="text"
                    value={form.categories?.join(", ") || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        categories: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              )}

            </form>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-neutral-200 bg-neutral-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
          >
            Batal
          </button>
          <button
            type="submit"
            form="coupon-form"
            disabled={save.isPending}
            className="rounded-lg bg-brand-strong px-4 py-2 text-sm font-medium text-white hover:bg-brand disabled:opacity-50"
          >
            {save.isPending ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}