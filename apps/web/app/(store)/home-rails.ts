import type { ProductsQuery } from "@/lib/catalog/api";

// Parameter 3 baris produk di home. Modul biasa (bukan "use client") supaya
// bisa dipakai page server (prefetch) dan ClientProductRails (render + key query)
// dengan nilai yang identik — key TanStack Query harus sama persis.
export const HOME_RAILS = {
  newest: { sort: "newest", limit: 8 },
  workspace: { category: "workspace", limit: 4 },
  livingRoom: { category: "living-room", limit: 4 },
} as const satisfies Record<string, ProductsQuery>;

export type HomeRailKey = keyof typeof HOME_RAILS;
