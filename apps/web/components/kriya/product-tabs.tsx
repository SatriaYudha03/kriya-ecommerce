"use client";

import { useState } from "react";
import type { ProductDetail } from "@/lib/types";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useLanguage } from "./language-provider";

type TabKey = "deskripsi" | "spesifikasi" | "perakitan";

const tabs: { key: TabKey; labelKey: MessageKey }[] = [
  { key: "deskripsi", labelKey: "product.tab.description" },
  { key: "spesifikasi", labelKey: "product.tab.specs" },
  { key: "perakitan", labelKey: "product.tab.assembly" },
];

export function ProductTabs({ product }: { product: ProductDetail }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<TabKey>("deskripsi");
  const d = product.dimensions;

  return (
    <div>
      <div className="flex gap-6 border-b border-neutral-200">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "-mb-px border-b-2 py-3 text-sm font-medium transition-colors",
              tab === item.key
                ? "border-brand text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800",
            )}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      <div className="py-6 text-sm leading-relaxed text-neutral-600">
        {tab === "deskripsi" && <p className="max-w-2xl">{product.description}</p>}

        {tab === "spesifikasi" && (
          <div className="grid max-w-xl gap-6 sm:grid-cols-2">
            <dl className="space-y-2">
              <Row label={t("product.dim.width")} value={`${d.width_cm} cm`} />
              <Row label={t("product.dim.depth")} value={`${d.depth_cm} cm`} />
              <Row label={t("product.dim.height")} value={`${d.height_cm} cm`} />
              <Row label={t("product.dim.weight")} value={`${product.weight_kg} kg`} />
            </dl>
            <div>
              <p className="text-neutral-900">{t("product.materials")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.materials.map((m) => (
                  <span
                    key={m}
                    className="rounded-full bg-brand-tint px-3 py-1 text-xs text-brand-strong capitalize"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "perakitan" &&
          (product.has_assembly_guide ? (
            <p className="max-w-2xl">{t("product.assembly.included")}</p>
          ) : (
            <p className="max-w-2xl">{t("product.assembly.none")}</p>
          ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-neutral-100 pb-2">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-neutral-900">{value}</dd>
    </div>
  );
}
