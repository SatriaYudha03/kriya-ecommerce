import { getHeroSlides } from "./api";
import type { HeroSlide } from "./types";

// Hero tidak boleh merusak beranda: gagal/kosong → null, Hero memakai slide bawaan.
// Cache data Next.js 30 detik: perubahan admin tampil di beranda dalam ≤30 dtk.
export async function getHeroSlidesServer(): Promise<HeroSlide[] | null> {
  try {
    const slides = await getHeroSlides({ revalidate: 30 });
    return slides.length > 0 ? slides : null;
  } catch {
    return null;
  }
}
