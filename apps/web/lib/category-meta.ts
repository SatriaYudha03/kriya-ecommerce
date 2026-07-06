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

export function categoryLabel(slug: string, fallback: string): string {
  return categoryLabels[slug] ?? fallback;
}
