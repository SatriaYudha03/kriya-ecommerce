"use client";

import { useAdminSettings, useUpdateAdminSettings } from "@/lib/customer/queries";
import { useLanguage } from "@/components/kriya/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { AdminSettings } from "@/lib/customer/types";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
      low_stock_threshold_default: Number(formData.low_stock_threshold_default)
    };
    update(payload, {
      onSuccess: () => {
        toast.success(t("adminCustomer.settings.success"));
      },
      onError: (err) => {
        toast.error(err.message);
      }
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="store_name">{t("adminCustomer.settings.storeName")}</Label>
        <Input id="store_name" name="store_name" required value={formData.store_name} onChange={handleChange} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="support_email">{t("adminCustomer.settings.supportEmail")}</Label>
          <Input id="support_email" name="support_email" type="email" value={formData.support_email || ""} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="support_phone">{t("adminCustomer.settings.supportPhone")}</Label>
          <Input id="support_phone" name="support_phone" value={formData.support_phone || ""} onChange={handleChange} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tax_rate_bp">{t("adminCustomer.settings.taxRate")}</Label>
          <Input id="tax_rate_bp" name="tax_rate_bp" type="number" min={0} max={5000} required value={formData.tax_rate_bp} onChange={handleChange} />
          <p className="text-xs text-muted-foreground">Basis points (100 = 1%)</p>
        </div>
        <div className="flex items-center space-x-2 pt-8">
          <Checkbox 
            id="prices_include_tax" 
            checked={formData.prices_include_tax} 
            onCheckedChange={(checked) => setFormData(prev => ({...prev, prices_include_tax: checked === true}))} 
          />
          <Label htmlFor="prices_include_tax">{t("adminCustomer.settings.pricesIncludeTax")}</Label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pending_payment_ttl_minutes">{t("adminCustomer.settings.paymentTtl")}</Label>
          <Input id="pending_payment_ttl_minutes" name="pending_payment_ttl_minutes" type="number" min={15} max={10080} required value={formData.pending_payment_ttl_minutes} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="return_window_days">{t("adminCustomer.settings.returnWindow")}</Label>
          <Input id="return_window_days" name="return_window_days" type="number" min={0} max={60} required value={formData.return_window_days} onChange={handleChange} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="low_stock_threshold_default">{t("adminCustomer.settings.lowStock")}</Label>
        <Input id="low_stock_threshold_default" name="low_stock_threshold_default" type="number" min={0} required value={formData.low_stock_threshold_default} onChange={handleChange} />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {t("adminCustomer.settings.save")}
      </Button>
    </form>
  );
}

export default function SettingsPage() {
  const { t } = useLanguage();
  const { data, isLoading } = useAdminSettings();

  if (isLoading || !data) return <div className="p-6"><Loader2 className="animate-spin w-6 h-6 text-muted-foreground" /></div>;

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">{t("adminCustomer.settings.title")}</h1>
      <SettingsForm initialData={data} />
    </div>
  );
}
