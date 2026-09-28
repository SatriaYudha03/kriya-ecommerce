"use client";

import { ProductRail } from "@/components/kriya/product-rail";
import { PromoBanner } from "@/components/kriya/promo-banner";
import { useLanguage } from "@/components/kriya/language-provider";
import type { ListEnvelope } from "@/lib/http";
import type { ProductListItem, ServerInitial } from "@/lib/catalog/types";
import { HOME_RAILS, type HomeRailKey } from "./home-rails";

export function ClientProductRails({
  initial,
}: {
  initial: Record<HomeRailKey, ServerInitial<ListEnvelope<ProductListItem>> | undefined>;
}) {
  const { t } = useLanguage();

  return (
    <>
      <ProductRail
        title={t("home.rail1.title")}
        subtitle={t("home.rail1.subtitle")}
        params={HOME_RAILS.newest}
        initial={initial.newest}
        skeletonCount={8}
      />
      <PromoBanner />
      <ProductRail
        title={t("home.rail2.title")}
        subtitle={t("home.rail2.subtitle")}
        href="/categories/workspace"
        params={HOME_RAILS.workspace}
        initial={initial.workspace}
      />
      <ProductRail
        title={t("home.rail3.title")}
        subtitle={t("home.rail3.subtitle")}
        href="/categories/living-room"
        params={HOME_RAILS.livingRoom}
        initial={initial.livingRoom}
      />
    </>
  );
}
