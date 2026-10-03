import { request } from "../http";
import type { Envelope, FetchOpts } from "../http";
import type { HeroSlide, HeroSlideInput } from "./types";

export async function getHeroSlides(opts: Pick<FetchOpts, "revalidate"> = {}): Promise<HeroSlide[]> {
  const { data } = await request<Envelope<HeroSlide[]>>("/api/v1/hero-slides", opts);
  return data;
}

export async function getAdminHeroSlides(): Promise<HeroSlide[]> {
  const { data } = await request<Envelope<HeroSlide[]>>("/api/v1/admin/hero-slides", { auth: true });
  return data;
}

export async function saveAdminHeroSlides(slides: HeroSlideInput[]): Promise<HeroSlide[]> {
  const { data } = await request<Envelope<HeroSlide[]>>("/api/v1/admin/hero-slides", {
    method: "PUT",
    body: { slides },
    auth: true,
  });
  return data;
}
