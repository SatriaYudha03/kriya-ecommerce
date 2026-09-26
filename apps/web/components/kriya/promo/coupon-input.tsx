"use client";

import { useState } from "react";
import { useLanguage } from "@/components/kriya/language-provider";
import type { QuoteCoupon } from "@/lib/types";
import { validateCoupon } from "@/lib/promo/api";
import type { MessageKey } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface CouponInputProps { 
  items: { variant_id: string; qty: number }[]; 
  appliedCode: string | null; 
  onApplied: (r: QuoteCoupon) => void; 
  onRemoved: () => void; 
}

export function CouponInput({ items, appliedCode, onApplied, onRemoved }: CouponInputProps) {
  const { t } = useLanguage();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    if (!code.trim() || items.length === 0) return;
    setLoading(true);
    setError("");
    
    const res = await validateCoupon(code.trim(), items);
    setLoading(false);
    
    if (res.valid) {
      setCode("");
      onApplied(res);
    } else {
      const msgKey = `promo.errors.${res.reason}` as MessageKey;
      // We pass msgKey to t. If it's invalid, t will just return the key, so it's safe.
      let errorMsg = t(msgKey);
      if (errorMsg === msgKey) {
        errorMsg = t("promo.errors.internal");
      }
      setError(errorMsg);
    }
  };

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
        <div className="flex flex-col">
          <span className="font-medium">{appliedCode}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemoved}>
          {t("promo.remove")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input 
          value={code} 
          onChange={(e) => setCode(e.target.value)} 
          placeholder={t("promo.placeholder")}
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleApply();
            }
          }}
        />
        <Button onClick={handleApply} disabled={loading || !code.trim()}>
          {t("promo.apply")}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
