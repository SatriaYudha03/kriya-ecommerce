"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/kriya/language-provider";
import { continuePayment } from "@/lib/customer/api";
import { syncPayment } from "@/lib/checkout/api";
import { ApiError } from "@/lib/http";
import { loadSnap, paySnap } from "@/lib/snap";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export interface ContinuePaymentButtonProps {
  orderId: string;
  size?: "sm" | "md";
  onSettled?: () => void;
}

export function ContinuePaymentButton({ orderId, size = "md", onSettled }: ContinuePaymentButtonProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    try {
      const { snap_token, midtrans_client_key } = await continuePayment(orderId);
      await loadSnap(midtrans_client_key);
      const result = await paySnap(snap_token);
      
      if (result === "error") {
        toast.error(t("customer.continuePayment.error"));
      } else {
        // Jangan hanya mengandalkan webhook (tidak sampai di localhost): tarik status
        // dari Midtrans dulu, baru refresh data. Gagal sync tidak fatal.
        await syncPayment(orderId).catch(() => undefined);
        onSettled?.();
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(t("customer.continuePayment.error"));
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to continue payment");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="default"
      size={size === "md" ? "default" : size}
      disabled={loading}
      onClick={handlePay}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t("customer.continuePayment.loading")}
        </>
      ) : (
        t("customer.continuePayment.button")
      )}
    </Button>
  );
}
