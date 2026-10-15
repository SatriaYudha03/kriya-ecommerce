"use client";

// Editor kupon halaman penuh (ala halaman diskon Shopify): kartu kode, nilai,
// cakupan, syarat, batas pakai, periode; kolom samping status + ringkasan.
// Pada mode edit, riwayat pemakaian kupon tampil di bawah form.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shuffle, TicketPercent } from "lucide-react";
import {
  useAdminCoupon,
  useAdminCouponRedemptions,
  useDeleteCoupon,
  useSaveCoupon,
} from "@/lib/promo/queries";
import { useAdminCategories } from "@/lib/catalog/queries";
import type { CouponPayload } from "@/lib/promo/types";
import { formatRupiah } from "@/lib/format";
import { useLanguage } from "@/components/kriya/language-provider";
import { ProductMultiSelect } from "./product-form";
import { CouponStatusBadge } from "./status-badges";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  ChoiceChip,
  ConfirmModal,
  DataTable,
  EmptyState,
  Field,
  FormGrid,
  Layout,
  LayoutAside,
  LayoutMain,
  LoadingState,
  Page,
  PageHeader,
  Pager,
  SelectInput,
  SkeletonRows,
  Td,
  TextInput,
  Th,
  ToggleRow,
  Tr,
  useAdminFormat,
} from "./ui";

const EMPTY: CouponPayload = {
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
};

// <input type="datetime-local"> bekerja di waktu lokal; API memakai ISO UTC.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const REDEMPTION_LIMIT = 10;

function Redemptions({ couponId }: { couponId: string }) {
  const { t } = useLanguage();
  const fmt = useAdminFormat();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminCouponRedemptions(couponId, page, REDEMPTION_LIMIT);
  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const tone = { applied: "success", reserved: "attention", released: "neutral" } as const;

  return (
    <Card flush title={t("adminPromo.redemptions.title")} description={t("adminPromo.redemptions.count", { total })}>
      {!isLoading && rows.length === 0 ? (
        <EmptyState title={t("adminPromo.redemptions.empty")} />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>{t("adminPromo.redemptions.thDate")}</Th>
              <Th>{t("adminPromo.redemptions.thOrderId")}</Th>
              <Th align="right">{t("adminPromo.redemptions.thItemsDiscount")}</Th>
              <Th align="right">{t("adminPromo.redemptions.thShippingDiscount")}</Th>
              <Th>{t("adminPromo.redemptions.thStatus")}</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows cols={5} rows={3} />
            ) : (
              rows.map((r) => (
                <Tr key={r.id} href={`/admin/orders/${r.order_id}`}>
                  <Td className="whitespace-nowrap text-admin-muted">{fmt.dateTime(r.created_at)}</Td>
                  <Td className="font-mono text-xs">{r.order_id.split("-")[0]}</Td>
                  <Td align="right" className="tabular-nums">
                    {formatRupiah(r.items_discount)}
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {formatRupiah(r.shipping_discount)}
                  </Td>
                  <Td>
                    <Badge tone={tone[r.status]}>{t(`admin.coupons.redemption.${r.status}` as const)}</Badge>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </DataTable>
      )}
      <Pager page={page} totalPages={Math.max(1, Math.ceil(total / REDEMPTION_LIMIT))} onPage={setPage} />
    </Card>
  );
}

export function CouponEditor({ couponId }: { couponId?: string }) {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const fmt = useAdminFormat();
  const isEdit = Boolean(couponId);
  const { data: coupon, isLoading, isError } = useAdminCoupon(couponId || "", isEdit);
  const { data: categories } = useAdminCategories();
  const save = useSaveCoupon();
  const del = useDeleteCoupon();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [seeded, setSeeded] = useState(false);
  const [form, setForm] = useState<CouponPayload>(EMPTY);

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

  const set = (patch: Partial<CouponPayload>) => setForm((f) => ({ ...f, ...patch }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate(
      { id: couponId, payload: form },
      {
        onSuccess: (saved) => {
          if (!isEdit) router.replace(`/admin/coupons/${saved.id}`);
        },
      },
    );
  }

  if (isEdit && isLoading) {
    return (
      <Page>
        <LoadingState />
      </Page>
    );
  }
  if (isEdit && (isError || !coupon)) {
    return (
      <Page>
        <PageHeader icon={TicketPercent} backHref="/admin/coupons" backLabel={t("admin.nav.discounts")} title={t("admin.coupons.notFound")} />
      </Page>
    );
  }

  const valueText =
    form.discount_type === "percent"
      ? t("admin.coupons.summaryPercent", { n: form.amount })
      : form.discount_type === "fixed_cart"
        ? t("admin.coupons.summaryFixed", { amount: formatRupiah(form.amount) })
        : t("adminPromo.coupons.freeShipping");
  const summary: string[] = [
    valueText,
    t(
      form.applies_to === "all"
        ? "admin.coupons.summaryAll"
        : form.applies_to === "products"
          ? "admin.coupons.summaryProducts"
          : "admin.coupons.summaryCategories",
      { n: form.applies_to === "products" ? (form.products?.length ?? 0) : (form.categories?.length ?? 0) },
    ),
    form.min_subtotal > 0
      ? t("admin.coupons.summaryMin", { amount: formatRupiah(form.min_subtotal) })
      : t("admin.coupons.summaryNoMin"),
    form.usage_limit ? t("admin.coupons.summaryLimit", { n: form.usage_limit }) : t("admin.coupons.summaryNoLimit"),
  ];
  if (form.usage_limit_per_user) summary.push(t("admin.coupons.summaryPerUser", { n: form.usage_limit_per_user }));
  if (form.exclude_sale_items) summary.push(t("adminPromo.form.excludeSale"));
  if (form.starts_at) summary.push(t("admin.coupons.summaryStarts", { date: fmt.dateTime(form.starts_at) }));
  if (form.ends_at) summary.push(t("admin.coupons.summaryEnds", { date: fmt.dateTime(form.ends_at) }));

  const saveLabel = t("adminPromo.form.save");

  return (
    <Page>
      <PageHeader
        icon={TicketPercent}
        backHref="/admin/coupons"
        backLabel={t("admin.nav.discounts")}
        title={isEdit ? coupon?.code : t("adminPromo.form.newTitle")}
        badge={isEdit && coupon ? <CouponStatusBadge status={coupon.status} /> : undefined}
        actions={
          <Button type="submit" form="coupon-editor" variant="primary" loading={save.isPending}>
            {saveLabel}
          </Button>
        }
      />

      <form id="coupon-editor" onSubmit={handleSubmit}>
        <Layout>
          <LayoutMain>
            <Card title={t("admin.coupons.codeCard")}>
              <div className="space-y-4">
                <Field
                  label={t("adminPromo.form.code")}
                  htmlFor="coupon-code"
                  help={t("admin.coupons.codeHint")}
                  labelAction={
                    <Button size="slim" variant="plain" onClick={() => set({ code: randomCode() })}>
                      <Shuffle /> {t("admin.coupons.generate")}
                    </Button>
                  }
                >
                  <TextInput
                    id="coupon-code"
                    required
                    value={form.code}
                    onChange={(e) => set({ code: e.target.value.toUpperCase() })}
                    placeholder={t("adminPromo.form.codePlaceholder")}
                    className="font-mono uppercase"
                  />
                </Field>
                <FormGrid>
                  <Field label={t("adminPromo.form.descId")} htmlFor="coupon-desc-id">
                    <TextInput
                      id="coupon-desc-id"
                      required
                      value={form.description_i18n.id || ""}
                      onChange={(e) => set({ description_i18n: { ...form.description_i18n, id: e.target.value } })}
                    />
                  </Field>
                  <Field label={t("adminPromo.form.descEn")} htmlFor="coupon-desc-en">
                    <TextInput
                      id="coupon-desc-en"
                      required
                      value={form.description_i18n.en || ""}
                      onChange={(e) => set({ description_i18n: { ...form.description_i18n, en: e.target.value } })}
                    />
                  </Field>
                </FormGrid>
              </div>
            </Card>

            <Card title={t("admin.coupons.valueCard")}>
              <FormGrid>
                <Field label={t("adminPromo.form.discountType")} htmlFor="coupon-type">
                  <SelectInput
                    id="coupon-type"
                    value={form.discount_type}
                    onChange={(e) => set({ discount_type: e.target.value as CouponPayload["discount_type"], amount: 0 })}
                  >
                    <option value="percent">{t("adminPromo.form.typePercent")}</option>
                    <option value="fixed_cart">{t("adminPromo.form.typeFixedCart")}</option>
                    <option value="free_shipping">{t("adminPromo.form.typeFreeShipping")}</option>
                  </SelectInput>
                </Field>
                {form.discount_type !== "free_shipping" && (
                  <Field label={t("admin.coupons.amount")} htmlFor="coupon-amount">
                    <TextInput
                      id="coupon-amount"
                      type="number"
                      required
                      min={1}
                      max={form.discount_type === "percent" ? 100 : undefined}
                      prefix={form.discount_type === "fixed_cart" ? "Rp" : undefined}
                      suffix={form.discount_type === "percent" ? "%" : undefined}
                      value={form.amount || ""}
                      onChange={(e) => set({ amount: parseInt(e.target.value) || 0 })}
                    />
                  </Field>
                )}
                {form.discount_type === "percent" && (
                  <Field label={t("admin.coupons.maxDiscount")} htmlFor="coupon-max" help={t("adminPromo.form.maxDiscountPlaceholder")}>
                    <TextInput
                      id="coupon-max"
                      type="number"
                      min={0}
                      prefix="Rp"
                      value={form.max_discount || ""}
                      onChange={(e) => set({ max_discount: e.target.value ? parseInt(e.target.value) : null })}
                    />
                  </Field>
                )}
              </FormGrid>
            </Card>

            <Card title={t("adminPromo.form.appliesTo")}>
              <div className="space-y-4">
                <SelectInput
                  value={form.applies_to}
                  aria-label={t("adminPromo.form.appliesTo")}
                  onChange={(e) => set({ applies_to: e.target.value as CouponPayload["applies_to"] })}
                >
                  <option value="all">{t("adminPromo.form.appliesAll")}</option>
                  <option value="products">{t("adminPromo.form.appliesProducts")}</option>
                  <option value="categories">{t("adminPromo.form.appliesCategories")}</option>
                </SelectInput>
                {form.applies_to === "products" && (
                  <ProductMultiSelect
                    label={t("admin.coupons.products")}
                    value={form.products ?? []}
                    onChange={(products) => set({ products })}
                  />
                )}
                {form.applies_to === "categories" && (
                  <div className="flex flex-wrap gap-1.5">
                    {categories?.map((c) => {
                      const on = form.categories?.includes(c.id) ?? false;
                      return (
                        <ChoiceChip
                          key={c.id}
                          selected={on}
                          onClick={() =>
                            set({
                              categories: on
                                ? (form.categories ?? []).filter((x) => x !== c.id)
                                : [...(form.categories ?? []), c.id],
                            })
                          }
                        >
                          {c.name}
                        </ChoiceChip>
                      );
                    })}
                  </div>
                )}
                <Checkbox
                  label={t("adminPromo.form.excludeSale")}
                  checked={form.exclude_sale_items}
                  onChange={(e) => set({ exclude_sale_items: e.target.checked })}
                />
              </div>
            </Card>

            <Card title={t("admin.coupons.requirements")}>
              <FormGrid>
                <Field label={t("admin.coupons.minSubtotal")} htmlFor="coupon-min" help={t("admin.coupons.minSubtotalHint")}>
                  <TextInput
                    id="coupon-min"
                    type="number"
                    min={0}
                    prefix="Rp"
                    value={form.min_subtotal || ""}
                    onChange={(e) => set({ min_subtotal: parseInt(e.target.value) || 0 })}
                  />
                </Field>
              </FormGrid>
            </Card>

            <Card title={t("admin.coupons.limits")}>
              <FormGrid>
                <Field label={t("adminPromo.form.usageLimit")} htmlFor="coupon-limit">
                  <TextInput
                    id="coupon-limit"
                    type="number"
                    min={1}
                    value={form.usage_limit || ""}
                    placeholder={t("adminPromo.form.unlimitedPlaceholder")}
                    onChange={(e) => set({ usage_limit: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </Field>
                <Field label={t("adminPromo.form.usageLimitPerUser")} htmlFor="coupon-user-limit">
                  <TextInput
                    id="coupon-user-limit"
                    type="number"
                    min={1}
                    value={form.usage_limit_per_user || ""}
                    placeholder={t("adminPromo.form.unlimitedPlaceholder")}
                    onChange={(e) => set({ usage_limit_per_user: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </Field>
              </FormGrid>
            </Card>

            <Card title={t("admin.coupons.dates")}>
              <FormGrid>
                <Field label={t("adminPromo.form.startsAt")} htmlFor="coupon-start">
                  <TextInput
                    id="coupon-start"
                    type="datetime-local"
                    value={toLocalInput(form.starts_at)}
                    onChange={(e) => set({ starts_at: fromLocalInput(e.target.value) })}
                  />
                </Field>
                <Field label={t("adminPromo.form.endsAt")} htmlFor="coupon-end" help={t("admin.coupons.endsHint")}>
                  <TextInput
                    id="coupon-end"
                    type="datetime-local"
                    value={toLocalInput(form.ends_at)}
                    onChange={(e) => set({ ends_at: fromLocalInput(e.target.value) })}
                  />
                </Field>
              </FormGrid>
            </Card>

            {isEdit && couponId && <Redemptions couponId={couponId} />}
          </LayoutMain>

          <LayoutAside>
            <Card title={t("adminPromo.form.status")}>
              <div className="space-y-4">
                <ToggleRow
                  label={t("adminPromo.form.isActive")}
                  checked={form.is_active}
                  onChange={(v) => set({ is_active: v })}
                />
                <ToggleRow
                  label={t("adminPromo.form.isPublic")}
                  help={t("admin.coupons.publicHint")}
                  checked={form.is_public}
                  onChange={(v) => set({ is_public: v })}
                />
              </div>
            </Card>

            <Card title={t("admin.coupons.summary")}>
              <p className="font-mono text-sm font-semibold">{form.code || t("admin.coupons.noCode")}</p>
              <p className="mt-0.5 text-admin-muted">
                {form.description_i18n[locale] || form.description_i18n.id || "—"}
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-4 text-admin-text marker:text-admin-faint">
                {summary.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {isEdit && coupon && (
                <p className="mt-3 border-t border-admin-border pt-3 text-admin-muted">
                  {t("admin.coupons.used", { n: coupon.total_redemptions })}
                </p>
              )}
            </Card>
          </LayoutAside>
        </Layout>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#d4d4d4] pt-5">
          {isEdit ? (
            <Button variant="critical" onClick={() => setConfirmDelete(true)}>
              {t("admin.coupons.delete")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <ButtonLink href="/admin/coupons">{t("adminPromo.form.cancel")}</ButtonLink>
            <Button type="submit" variant="primary" loading={save.isPending}>
              {saveLabel}
            </Button>
          </div>
        </div>
      </form>

      {isEdit && couponId && coupon && (
        <ConfirmModal
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title={t("admin.coupons.delete")}
          message={t("adminPromo.coupons.deleteConfirm", { code: coupon.code })}
          confirmLabel={t("adminPromo.coupons.delete")}
          loading={del.isPending}
          onConfirm={() => del.mutate(couponId, { onSuccess: () => router.replace("/admin/coupons") })}
        />
      )}
    </Page>
  );
}
