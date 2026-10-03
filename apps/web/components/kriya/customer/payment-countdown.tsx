"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

import { useLanguage } from "@/components/kriya/language-provider";
import { formatCountdown, isPaymentWindowClosed, paymentMsLeft } from "@/lib/checkout/payment-window";
import { cn } from "@/lib/utils";

const URGENT_MS = 60 * 60 * 1000;

// Detik berjalan untuk komponen yang bergantung pada tenggat bayar.
export function useNow(intervalMs: number = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

// Hitung mundur ke payment.expires_at (= tenggat bayar order, tidak pernah diperpanjang).
// Tidak merender apa pun bila tenggat tidak diketahui atau sudah lewat — pemanggil yang
// menampilkan keadaan "tenggat lewat".
export function PaymentCountdown({
  expiresAt,
  now,
  className,
}: {
  expiresAt: string | null;
  now: number;
  className?: string;
}) {
  const { t, locale } = useLanguage();
  const left = paymentMsLeft(expiresAt, now);
  if (left === null || left <= 0 || !expiresAt) return null;

  const deadline = new Date(expiresAt).toLocaleString(locale, {
    day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
  const urgent = left < URGENT_MS;

  return (
    <div className={cn("text-right", className)}>
      <p className="text-xs text-neutral-500">{t("checkoutV2.pay.timeLeft")}</p>
      <p
        className={cn(
          "mt-0.5 flex items-center justify-end gap-1.5 font-mono text-lg font-semibold tabular-nums",
          urgent ? "text-red-600" : "text-amber-700",
        )}
        aria-live="off"
      >
        <Clock className="h-4 w-4 shrink-0" />
        {formatCountdown(left, t("checkoutV2.pay.days"))}
      </p>
      <p className="mt-0.5 text-xs text-neutral-500">{t("checkoutV2.pay.expiresAt", { time: deadline })}</p>
    </div>
  );
}

// Versi satu baris untuk detail pesanan: hitung mundur selama tenggat masih terbuka,
// peringatan setelah lewat. Detiknya sendiri supaya halaman induk tidak render ulang.
export function PaymentDeadlineNote({ expiresAt, className }: { expiresAt: string | null; className?: string }) {
  const { t } = useLanguage();
  const now = useNow();
  const left = paymentMsLeft(expiresAt, now);
  if (left === null) return null;
  // Sama dengan BE: sisa < 2 menit dianggap sudah tutup (attempt baru ditolak).
  if (isPaymentWindowClosed(expiresAt, now)) {
    return (
      <p className={cn("flex items-center gap-1.5 text-sm font-medium text-red-600", className)}>
        <Clock className="h-4 w-4 shrink-0" />
        {t("checkoutV2.pay.windowClosedTitle")}
      </p>
    );
  }
  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-sm",
        left < URGENT_MS ? "text-red-600" : "text-amber-700",
        className,
      )}
    >
      <Clock className="h-4 w-4 shrink-0" />
      {t("checkoutV2.pay.timeLeft")}:{" "}
      <span className="font-mono font-semibold tabular-nums">{formatCountdown(left, t("checkoutV2.pay.days"))}</span>
    </p>
  );
}
