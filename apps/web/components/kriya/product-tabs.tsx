"use client";

import { useState } from "react";
import type { ProductDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

type TabKey = "deskripsi" | "spesifikasi" | "perakitan";

const tabs: { key: TabKey; label: string }[] = [
  { key: "deskripsi", label: "Deskripsi" },
  { key: "spesifikasi", label: "Dimensi & material" },
  { key: "perakitan", label: "Panduan perakitan" },
];

export function ProductTabs({ product }: { product: ProductDetail }) {
  const [tab, setTab] = useState<TabKey>("deskripsi");
  const d = product.dimensions;

  return (
    <div>
      <div className="flex gap-6 border-b border-neutral-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "-mb-px border-b-2 py-3 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-brand text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="py-6 text-sm leading-relaxed text-neutral-600">
        {tab === "deskripsi" && <p className="max-w-2xl">{product.description}</p>}

        {tab === "spesifikasi" && (
          <div className="grid max-w-xl gap-6 sm:grid-cols-2">
            <dl className="space-y-2">
              <Row label="Lebar" value={`${d.width_cm} cm`} />
              <Row label="Dalam" value={`${d.depth_cm} cm`} />
              <Row label="Tinggi" value={`${d.height_cm} cm`} />
              <Row label="Berat" value={`${product.weight_kg} kg`} />
            </dl>
            <div>
              <p className="text-neutral-900">Material</p>
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
            <p className="max-w-2xl">
              Produk ini dilengkapi panduan perakitan langkah demi langkah. Panduan interaktif
              lengkap akan tampil di sini setelah katalog terhubung ke layanan konten.
            </p>
          ) : (
            <p className="max-w-2xl">
              Produk ini tidak memerlukan perakitan — langsung siap dipakai setelah tiba.
            </p>
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
