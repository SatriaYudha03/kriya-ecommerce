"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useAdminCoupon, useSaveCoupon } from "@/lib/promo/queries";
import type { CouponPayload } from "@/lib/promo/types";
import { useLanguage } from "@/components/kriya/language-provider";

export function CouponForm({ couponId, onClose }: { couponId?: string; onClose: () => void }) {
  const { t } = useLanguage();
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="coupon-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 id="coupon-dialog-title" className="text-lg font-bold text-neutral-900">
            {couponId ? t("adminPromo.form.editTitle") : t("adminPromo.form.newTitle")}
          </h2>
          <button
            onClick={onClose}
            aria-label={t("adminPromo.form.close")}
            className="text-neutral-500 hover:text-neutral-900"
          >
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
                  <label htmlFor="coupon-code" className="text-sm font-medium text-neutral-700">
                    {t("adminPromo.form.code")}
                  </label>
                  <input
                    id="coupon-code"
                    type="text"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                    placeholder={t("adminPromo.form.codePlaceholder")}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium text-neutral-700 block">
                    {t("adminPromo.form.status")}
                  </span>
                  <div className="flex flex-col gap-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                        className="rounded border-neutral-300 text-brand focus:ring-brand"
                      />
                      <span className="text-sm">{t("adminPromo.form.isActive")}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.is_public}
                        onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                        className="rounded border-neutral-300 text-brand focus:ring-brand"
                      />
                      <span className="text-sm">{t("adminPromo.form.isPublic")}</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="coupon-desc-id" className="text-sm font-medium text-neutral-700">
                  {t("adminPromo.form.descId")}
                </label>
                <input
                  id="coupon-desc-id"
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
                <label htmlFor="coupon-desc-en" className="text-sm font-medium text-neutral-700">
                  {t("adminPromo.form.descEn")}
                </label>
                <input
                  id="coupon-desc-en"
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
                  <label htmlFor="coupon-discount-type" className="text-sm font-medium text-neutral-700">
                    {t("adminPromo.form.discountType")}
                  </label>
                  <select
                    id="coupon-discount-type"
                    value={form.discount_type}
                    onChange={(e) =>
                      setForm({ ...form, discount_type: e.target.value as CouponPayload["discount_type"], amount: 0 })
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="percent">{t("adminPromo.form.typePercent")}</option>
                    <option value="fixed_cart">{t("adminPromo.form.typeFixedCart")}</option>
                    <option value="free_shipping">{t("adminPromo.form.typeFreeShipping")}</option>
                  </select>
                </div>
                {form.discount_type !== "free_shipping" && (
                  <div className="space-y-1">
                    <label htmlFor="coupon-amount" className="text-sm font-medium text-neutral-700">
                      {t("adminPromo.form.amount", { unit: form.discount_type === "percent" ? "%" : "Rp" })}
                    </label>
                    <input
                      id="coupon-amount"
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
                  <label htmlFor="coupon-min-subtotal" className="text-sm font-medium text-neutral-700">
                    {t("adminPromo.form.minSubtotal")}
                  </label>
                  <input
                    id="coupon-min-subtotal"
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
                  <label htmlFor="coupon-max-discount" className="text-sm font-medium text-neutral-700">
                    {t("adminPromo.form.maxDiscount")}
                  </label>
                  <input
                    id="coupon-max-discount"
                    type="number"
                    min={0}
                    value={form.max_discount || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        max_discount: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder={t("adminPromo.form.maxDiscountPlaceholder")}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="coupon-starts-at" className="text-sm font-medium text-neutral-700">
                    {t("adminPromo.form.startsAt")}
                  </label>
                  <input
                    id="coupon-starts-at"
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
                  <label htmlFor="coupon-ends-at" className="text-sm font-medium text-neutral-700">
                    {t("adminPromo.form.endsAt")}
                  </label>
                  <input
                    id="coupon-ends-at"
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
                  <label htmlFor="coupon-usage-limit" className="text-sm font-medium text-neutral-700">
                    {t("adminPromo.form.usageLimit")}
                  </label>
                  <input
                    id="coupon-usage-limit"
                    type="number"
                    min={1}
                    value={form.usage_limit || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        usage_limit: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder={t("adminPromo.form.unlimitedPlaceholder")}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="coupon-user-limit" className="text-sm font-medium text-neutral-700">
                    {t("adminPromo.form.usageLimitPerUser")}
                  </label>
                  <input
                    id="coupon-user-limit"
                    type="number"
                    min={1}
                    value={form.usage_limit_per_user || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        usage_limit_per_user: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder={t("adminPromo.form.unlimitedPlaceholder")}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="coupon-applies-to" className="text-sm font-medium text-neutral-700">
                  {t("adminPromo.form.appliesTo")}
                </label>
                <select
                  id="coupon-applies-to"
                  value={form.applies_to}
                  onChange={(e) => setForm({ ...form, applies_to: e.target.value as CouponPayload["applies_to"] })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="all">{t("adminPromo.form.appliesAll")}</option>
                  <option value="products">{t("adminPromo.form.appliesProducts")}</option>
                  <option value="categories">{t("adminPromo.form.appliesCategories")}</option>
                </select>
              </div>

              {form.applies_to === "products" && (
                <div className="space-y-1">
                  <label htmlFor="coupon-product-ids" className="text-sm font-medium text-neutral-700">
                    {t("adminPromo.form.productIds")}
                  </label>
                  <input
                    id="coupon-product-ids"
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
                  <label htmlFor="coupon-category-ids" className="text-sm font-medium text-neutral-700">
                    {t("adminPromo.form.categoryIds")}
                  </label>
                  <input
                    id="coupon-category-ids"
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

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.exclude_sale_items}
                    onChange={(e) => setForm({ ...form, exclude_sale_items: e.target.checked })}
                    className="rounded border-neutral-300 text-brand focus:ring-brand"
                  />
                  <span className="text-sm text-neutral-700">{t("adminPromo.form.excludeSale")}</span>
                </label>
              </div>
            </form>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-neutral-200 bg-neutral-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
          >
            {t("adminPromo.form.cancel")}
          </button>
          <button
            type="submit"
            form="coupon-form"
            disabled={save.isPending}
            className="rounded-lg bg-brand-strong px-4 py-2 text-sm font-medium text-white hover:bg-brand disabled:opacity-50"
          >
            {save.isPending ? t("adminPromo.form.saving") : t("adminPromo.form.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
