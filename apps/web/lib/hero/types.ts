// Kontrak GET /api/v1/hero-slides (publik) dan /api/v1/admin/hero-slides (admin).
export interface HeroSlide {
  id: string;
  eyebrow_id: string;
  eyebrow_en: string;
  title_id: string;
  title_en: string;
  subtitle_id: string;
  subtitle_en: string;
  href: string;
  image_path: string;
  image_url: string;
  alt: string;
  is_active: boolean;
}

// Isi satu slide yang dikirim admin (tanpa id & image_url — urutan array = urutan tampil).
export type HeroSlideInput = Omit<HeroSlide, "id" | "image_url">;
