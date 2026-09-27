import type { QuoteShippingOption } from "@/lib/types";
import { formatRupiah } from "@/lib/format";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/kriya/language-provider";
import { Loader2 } from "lucide-react";

export interface ShippingMethodPickerProps { 
  options: QuoteShippingOption[]; 
  value: string | null; 
  onChange: (methodId: string) => void; 
  loading?: boolean; 
}

export function ShippingMethodPicker({ options, value, onChange, loading }: ShippingMethodPickerProps) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-2 text-muted-foreground" role="status">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-xs">{t("customer.shippingPicker.loading")}</span>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="p-4 border rounded-md text-center text-sm text-muted-foreground bg-muted/50">
        {t("customer.shippingPicker.empty")}
      </div>
    );
  }

  return (
    <RadioGroup value={value || ""} onValueChange={onChange} className="space-y-3">
      {options.map((opt) => (
        <div
          key={opt.method_id}
          className={`flex items-center space-x-3 border p-4 rounded-md hover:bg-muted/50 transition-colors ${
            value === opt.method_id ? "border-brand bg-brand/5" : "border-border"
          }`}
        >
          <RadioGroupItem value={opt.method_id} id={`method-${opt.method_id}`} />
          <Label htmlFor={`method-${opt.method_id}`} className="flex-1 flex justify-between items-center cursor-pointer">
            <div className="flex flex-col">
              <span className="font-medium text-sm text-foreground">{opt.name}</span>
              <span className="text-xs text-muted-foreground mt-0.5">
                {t("customer.shippingPicker.estimate", { min: opt.eta_min_days, max: opt.eta_max_days })}
              </span>
            </div>
            <div className="font-semibold text-sm">
              {opt.is_free ? (
                <span className="inline-flex items-center rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {t("customer.shippingPicker.free")}
                </span>
              ) : (
                <span className="text-foreground">{formatRupiah(opt.cost)}</span>
              )}
            </div>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
