import type { QuoteShippingOption } from "@/lib/types";
import { formatRupiah } from "@/lib/format";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export interface ShippingMethodPickerProps { 
  options: QuoteShippingOption[]; 
  value: string | null; 
  onChange: (methodId: string) => void; 
  loading?: boolean; 
}

export function ShippingMethodPicker({ options, value, onChange, loading }: ShippingMethodPickerProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="p-4 border rounded-md text-center text-sm text-muted-foreground bg-muted/50">
        Tidak ada metode pengiriman tersedia untuk alamat ini.
      </div>
    );
  }

  return (
    <RadioGroup value={value || ""} onValueChange={onChange} className="space-y-3">
      {options.map((opt) => (
        <div key={opt.method_id} className="flex items-center space-x-3 border p-4 rounded-md hover:bg-muted/50 transition-colors">
          <RadioGroupItem value={opt.method_id} id={`method-${opt.method_id}`} />
          <Label htmlFor={`method-${opt.method_id}`} className="flex-1 flex justify-between cursor-pointer">
            <div className="flex flex-col">
              <span className="font-medium text-sm">{opt.name}</span>
              <span className="text-xs text-muted-foreground">
                Estimasi {opt.eta_min_days}-{opt.eta_max_days} hari
              </span>
            </div>
            <div className="font-semibold text-sm">
              {opt.is_free ? (
                <span className="text-green-600">Gratis</span>
              ) : (
                formatRupiah(opt.cost)
              )}
            </div>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
