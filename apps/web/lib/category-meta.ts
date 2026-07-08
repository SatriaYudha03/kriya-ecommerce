// Label & aksen ruangan berbahasa Indonesia (KRIYA-MASTER: teks UI Indonesia).
// Slug kategori mengikuti kontrak (6 kategori final).

export const categoryLabels: Record<string, string> = {
  "living-room": "Ruang keluarga",
  bedroom: "Kamar tidur",
  workspace: "Ruang kerja",
  "dining-room": "Ruang makan",
  storage: "Penyimpanan",
  lighting: "Pencahayaan",
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

export function categoryLabel(slug: string, fallback: string): string {
  return categoryLabels[slug] ?? fallback;
}
