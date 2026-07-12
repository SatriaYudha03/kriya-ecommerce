"use client";

import { Headphones, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { useLanguage } from "./language-provider";

export function ServiceFeatures() {
  const { t } = useLanguage();
  const features = [
    { icon: Truck, title: t("home.features.delivery" as any), desc: t("home.features.deliveryDesc" as any) },
    { icon: RotateCcw, title: t("home.features.return" as any), desc: t("home.features.returnDesc" as any) },
    { icon: ShieldCheck, title: t("home.features.payment" as any), desc: t("home.features.paymentDesc" as any) },
    { icon: Headphones, title: t("home.features.support" as any), desc: t("home.features.supportDesc" as any) },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid grid-cols-2 gap-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-strong">
              <f.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-neutral-900">{f.title}</p>
              <p className="text-xs text-neutral-500">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
