// Label & aksen ruangan per bahasa (KRIYA-MASTER: UI dua bahasa EN/ID, default id).
// Slug kategori mengikuti kontrak (6 kategori final).

import type { Locale } from "@/lib/i18n";

export const categoryLabels: Record<Locale, Record<string, string>> = {
  id: {
    "living-room": "Ruang keluarga",
    bedroom: "Kamar tidur",
    workspace: "Ruang kerja",
    "dining-room": "Ruang makan",
    storage: "Penyimpanan",
    lighting: "Pencahayaan",
  },
  en: {
    "living-room": "Living room",
    bedroom: "Bedroom",
    workspace: "Workspace",
    "dining-room": "Dining room",
    storage: "Storage",
    lighting: "Lighting",
  },
};

export const categoryGradients: Record<string, string> = {
  "living-room": "from-brand-tint to-brand-soft",
  bedroom: "from-sand to-brand-soft",
  workspace: "from-cream to-sand",
  "dining-room": "from-brand-tint to-sand",
  storage: "from-sand to-cream",
  lighting: "from-cream to-brand-tint",
};

export const categoryImages: Record<string, string> = {
  "living-room":
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80&auto=format&fit=crop",
  bedroom:
    "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=400&q=80&auto=format&fit=crop",
  workspace:
    "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&q=80&auto=format&fit=crop",
  "dining-room":
    "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400&q=80&auto=format&fit=crop",
  storage:
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80&auto=format&fit=crop",
  lighting:
    "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400&q=80&auto=format&fit=crop",
};

export function categoryLabel(slug: string, fallback: string, locale: Locale = "id"): string {
  return categoryLabels[locale]?.[slug] ?? categoryLabels.id[slug] ?? fallback;
}
