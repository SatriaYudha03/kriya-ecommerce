"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock, Percent, Copy, Check } from "lucide-react";
import { useLanguage } from "./language-provider";
import { getPublicCoupons, type PublicCoupon } from "@/lib/promo/api";

// Banner penawaran (gaya "deal of the day" anon) dengan hitung mundur ke tengah
// malam. Countdown dihitung setelah mount agar tidak ada mismatch hidrasi.
function useCountdownToMidnight() {
  const [left, setLeft] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(24, 0, 0, 0);
      const diff = Math.max(0, end.getTime() - now.getTime());
      const h = Math.floor(diff / 3.6e6);
      const m = Math.floor((diff % 3.6e6) / 6e4);
      const s = Math.floor((diff % 6e4) / 1000);
      const pad = (n: number) => String(n).padStart(2, "0");
      setLeft(`${pad(h)}:${pad(m)}:${pad(s)}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return left;
}

export function PromoBanner() {
  const left = useCountdownToMidnight();
  const { t, locale } = useLanguage();
  const [coupons, setCoupons] = useState<PublicCoupon[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    getPublicCoupons().then(setCoupons).catch(() => {});
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col items-start gap-6 overflow-hidden rounded-3xl bg-clay px-6 py-10 text-cream sm:px-10 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-cream/15 px-3 py-1 text-xs font-medium tracking-wide">
            <Percent className="h-3.5 w-3.5" />
            {t("home.promo.badge")}
          </span>
          <h2 className="mt-4 max-w-lg text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("home.promo.title")}
          </h2>
          <p className="mt-2 max-w-md text-sm text-cream/80">
            {t("home.promo.desc")}
          </p>
        </div>
        <div className="flex flex-col items-start gap-4 md:items-end">
          <div className="inline-flex items-center gap-2 rounded-xl bg-cream/10 px-4 py-2 font-mono text-lg tabular-nums">
            <Clock className="h-4 w-4" />
            {left ?? "--:--:--"}
          </div>
          <Link
            href="/categories/workspace"
            className="rounded-full bg-cream px-6 py-3 text-sm font-medium text-clay transition-colors hover:bg-white"
          >
            {t("home.promo.cta")}
          </Link>
        </div>
      </div>

      {coupons.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-xl font-semibold tracking-tight">{t("promo.title")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coupons.map((c) => {
              const desc = c.description_i18n[locale] || c.description_i18n["id"] || "";
              return (
                <div key={c.id} className="border rounded-xl p-4 flex flex-col gap-2 bg-background">
                  <div className="flex justify-between items-start">
                    <div className="font-mono text-lg font-bold bg-muted px-2 py-1 rounded">
                      {c.code}
                    </div>
                    <button
                      onClick={() => handleCopy(c.code)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      title={t("promo.copy_code")}
                      aria-label={copiedCode === c.code ? t("promo.copied") : t("promo.copy_code")}
                    >
                      {copiedCode === c.code ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
