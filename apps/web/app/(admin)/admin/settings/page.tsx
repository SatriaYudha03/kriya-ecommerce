"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Settings, Truck } from "lucide-react";
import { useAdminSettings, useUpdateAdminSettings } from "@/lib/customer/queries";
import type { AdminSettings } from "@/lib/customer/types";
import { useLanguage } from "@/components/kriya/language-provider";
import {
  AnnotatedSection,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  ErrorState,
  Field,
  FormGrid,
  LoadingState,
  Page,
  PageHeader,
  TextInput,
} from "@/components/kriya/admin/ui";

function SettingsForm({ initialData }: { initialData: AdminSettings }) {
  const { t } = useLanguage();
  const { mutate: update, isPending } = useUpdateAdminSettings();
  const [formData, setFormData] = useState<AdminSettings>(initialData);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      tax_rate_bp: Number(formData.tax_rate_bp),
      pending_payment_ttl_minutes: Number(formData.pending_payment_ttl_minutes),
      return_window_days: Number(formData.return_window_days),
      low_stock_threshold_default: Number(formData.low_stock_threshold_default),
    };
    update(payload, {
      onSuccess: () => toast.success(t("adminCustomer.settings.success")),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "number" ? Number(value) : value }));
  };

  return (
    <form id="settings-form" onSubmit={onSubmit}>
      <AnnotatedSection title={t("admin.settings.storeTitle")} description={t("admin.settings.storeDesc")}>
        <Card>
          <div className="space-y-4">
            <Field label={t("adminCustomer.settings.storeName")} htmlFor="store_name">
              <TextInput id="store_name" name="store_name" required value={formData.store_name} onChange={handleChange} />
            </Field>
            <FormGrid>
              <Field label={t("adminCustomer.settings.supportEmail")} htmlFor="support_email">
                <TextInput
                  id="support_email"
                  name="support_email"
                  type="email"
                  value={formData.support_email || ""}
                  onChange={handleChange}
                />
              </Field>
              <Field label={t("adminCustomer.settings.supportPhone")} htmlFor="support_phone">
                <TextInput id="support_phone" name="support_phone" value={formData.support_phone || ""} onChange={handleChange} />
              </Field>
            </FormGrid>
          </div>
        </Card>
      </AnnotatedSection>

      <AnnotatedSection title={t("admin.settings.taxTitle")} description={t("admin.settings.taxDesc")}>
        <Card>
          <div className="space-y-4">
            <Field
              label={t("admin.settings.taxRate")}
              htmlFor="tax_rate_bp"
              help={t("admin.settings.taxRateHint", { pct: (Number(formData.tax_rate_bp) / 100).toLocaleString() })}
            >
              <TextInput
                id="tax_rate_bp"
                name="tax_rate_bp"
                type="number"
                min={0}
                max={5000}
                required
                suffix="bp"
                className="sm:max-w-56"
                value={formData.tax_rate_bp}
                onChange={handleChange}
              />
            </Field>
            <Checkbox
              label={t("adminCustomer.settings.pricesIncludeTax")}
              checked={formData.prices_include_tax}
              onChange={(e) => setFormData((prev) => ({ ...prev, prices_include_tax: e.target.checked }))}
            />
          </div>
        </Card>
      </AnnotatedSection>

      <AnnotatedSection title={t("admin.settings.checkoutTitle")} description={t("admin.settings.checkoutDesc")}>
        <Card>
          <FormGrid>
            <Field label={t("admin.settings.paymentTtl")} htmlFor="pending_payment_ttl_minutes" help={t("admin.settings.paymentTtlHint")}>
              <TextInput
                id="pending_payment_ttl_minutes"
                name="pending_payment_ttl_minutes"
                type="number"
                min={15}
                max={10080}
                required
                suffix={t("admin.settings.minutes")}
                value={formData.pending_payment_ttl_minutes}
                onChange={handleChange}
              />
            </Field>
            <Field label={t("admin.settings.returnWindow")} htmlFor="return_window_days" help={t("admin.settings.returnWindowHint")}>
              <TextInput
                id="return_window_days"
                name="return_window_days"
                type="number"
                min={0}
                max={60}
                required
                suffix={t("admin.settings.days")}
                value={formData.return_window_days}
                onChange={handleChange}
              />
            </Field>
          </FormGrid>
        </Card>
      </AnnotatedSection>

      <AnnotatedSection title={t("nav.admin.inventory")} description={t("admin.settings.inventoryDesc")}>
        <Card>
          <Field label={t("adminCustomer.settings.lowStock")} htmlFor="low_stock_threshold_default">
            <TextInput
              id="low_stock_threshold_default"
              name="low_stock_threshold_default"
              type="number"
              min={0}
              required
              suffix={t("admin.settings.units")}
              className="sm:max-w-56"
              value={formData.low_stock_threshold_default}
              onChange={handleChange}
            />
          </Field>
        </Card>
      </AnnotatedSection>

      <AnnotatedSection title={t("nav.admin.shipping")} description={t("admin.settings.shippingDesc")}>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-admin-hover">
                <Truck className="size-4" />
              </span>
              <p>{t("adminCustomer.shipping.subtitle")}</p>
            </div>
            <ButtonLink href="/admin/shipping" size="slim">
              {t("admin.settings.manage")}
            </ButtonLink>
          </div>
        </Card>
      </AnnotatedSection>

      <div className="mt-2 flex justify-end border-t border-[#d4d4d4] pt-5">
        <Button type="submit" variant="primary" loading={isPending}>
          {t("adminCustomer.settings.save")}
        </Button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const { t } = useLanguage();
  const { data, isLoading, isError, refetch } = useAdminSettings();

  return (
    <Page>
      <PageHeader icon={Settings} title={t("adminCustomer.settings.title")} />
      {isLoading ? (
        <Card>
          <LoadingState />
        </Card>
      ) : isError || !data ? (
        <Card>
          <ErrorState onRetry={() => refetch()} />
        </Card>
      ) : (
        <SettingsForm initialData={data} />
      )}
    </Page>
  );
}
