"use client";

import { ProductRail } from "@/components/kriya/product-rail";
import { PromoBanner } from "@/components/kriya/promo-banner";
import { useLanguage } from "@/components/kriya/language-provider";

export function ClientProductRails() {
  const { t } = useLanguage();

  return (
    <>
      <ProductRail
        title={t("home.rail1.title" as any)}
        subtitle={t("home.rail1.subtitle" as any)}
        params={{ sort: "newest", limit: 8 }}
        skeletonCount={8}
      />
      <PromoBanner />
      <ProductRail
        title={t("home.rail2.title" as any)}
        subtitle={t("home.rail2.subtitle" as any)}
        href="/categories/workspace"
        params={{ category: "workspace", limit: 4 }}
      />
      <ProductRail
        title={t("home.rail3.title" as any)}
        subtitle={t("home.rail3.subtitle" as any)}
        href="/categories/living-room"
        params={{ category: "living-room", limit: 4 }}
      />
    </>
  );
}