"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HeroSlide } from "@/lib/hero/types";
import { useLanguage } from "./language-provider";

interface Slide {
  eyebrow: string;
  title: string;
  subtitle: string;
  href: string;
  image: string;
  alt: string;
}

const INTERVAL_MS = 6000;

// Hero full-bleed: foto memenuhi lebar layar, header transparan di atasnya
// (-mt-20 = tinggi header), teks besar di kiri bawah. Semua slide dirender
// bertumpuk agar pergantiannya crossfade, bukan remount.
export function Hero({ slides: remote }: { slides?: HeroSlide[] | null }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const { t, locale } = useLanguage();

  const fallback: Slide[] = [
    {
      eyebrow: t("home.hero.eyebrow1"),
      title: t("home.hero.title1"),
      subtitle: t("home.hero.subtitle1"),
      href: "/categories/living-room",
      image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=2000&q=80&auto=format&fit=crop",
      alt: "Sofa modern di ruang keluarga yang hangat",
    },
    {
      eyebrow: t("home.hero.eyebrow2"),
      title: t("home.hero.title2"),
      subtitle: t("home.hero.subtitle2"),
      href: "/categories/workspace",
      image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=2000&q=80&auto=format&fit=crop",
      alt: "Meja kerja minimalis dengan pencahayaan alami",
    },
    {
      eyebrow: t("home.hero.eyebrow3"),
      title: t("home.hero.title3"),
      subtitle: t("home.hero.subtitle3"),
      href: "/categories/lighting",
      image: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=2000&q=80&auto=format&fit=crop",
      alt: "Lampu lantai dengan cahaya hangat di sudut ruangan",
    },
  ];

  // Slide dari admin (hero_slides) bila ada; kalau kosong/gagal → slide bawaan di atas.
  const slides: Slide[] =
    remote && remote.length > 0
      ? remote.map((r) => ({
          eyebrow: locale === "en" ? r.eyebrow_en : r.eyebrow_id,
          title: locale === "en" ? r.title_en : r.title_id,
          subtitle: locale === "en" ? r.subtitle_en : r.subtitle_id,
          href: r.href,
          image: r.image_url,
          alt: r.alt,
        }))
      : fallback;

  const count = slides.length;
  const go = useCallback((n: number) => setIndex((i) => (i + n + count) % count), [count]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused, count, index]);

  const slide = slides[index % count];

  return (
    <section
      aria-roledescription="carousel"
      className="relative -mt-20 h-[calc(100svh-2.25rem)] min-h-[560px] overflow-hidden bg-espresso text-white sm:max-h-[860px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((s, i) => (
        <div
          key={s.image}
          aria-hidden={i !== index}
          className={cn(
            "absolute inset-0 transition-opacity duration-1000 ease-out",
            i === index ? "opacity-100" : "opacity-0",
          )}
        >
          <Image
            src={s.image}
            alt={s.alt}
            fill
            sizes="100vw"
            priority={i === 0}
            className={cn(
              "object-cover transition-transform duration-[7000ms] ease-out motion-reduce:transition-none",
              i === index ? "scale-105" : "scale-100",
            )}
          />
        </div>
      ))}

      {/* Lapisan gelap: rata untuk header + gradasi kiri-bawah untuk keterbacaan teks. */}
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-black/15 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/40 to-transparent" />

      <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-16 sm:px-6 sm:pb-20 lg:px-10 lg:pb-24">
        <div key={index} className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          <p className="text-xs font-semibold tracking-[0.25em] text-brand-soft uppercase sm:text-sm">
            {slide.eyebrow}
          </p>
          <h1 className="mt-4 text-5xl leading-[1.05] font-medium tracking-tight text-balance sm:text-6xl lg:text-7xl">
            {slide.title}
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/85 sm:text-lg">{slide.subtitle}</p>
        </div>

        <div className="mt-9 flex flex-wrap gap-3 sm:gap-4">
          <Link
            href={slide.href}
            className="rounded-sm bg-brand px-6 py-3.5 text-sm font-bold tracking-wide text-white uppercase transition-colors hover:bg-brand-strong"
          >
            {t("home.hero.shopNow")}
          </Link>
          <a
            href="#collections"
            onClick={(e) => {
              const target = document.getElementById("collections");
              if (!target) return;
              e.preventDefault();
              const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              // scroll-mt-24 di target menjaga judul tidak tertutup header sticky.
              target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
              history.replaceState(null, "", "#collections");
            }}
            className="rounded-sm border border-white px-6 py-3.5 text-sm font-bold tracking-wide text-white uppercase transition-colors hover:bg-white hover:text-neutral-900"
          >
            {t("home.hero.explore")}
          </a>
        </div>

        <div className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-4 sm:right-6 sm:bottom-8 sm:left-auto sm:translate-x-0 lg:right-10">
          <div className="flex gap-2">
            {slides.map((s, i) => (
              <button
                key={s.image}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={t("home.hero.goTo", { n: i + 1 })}
                aria-current={i === index}
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  i === index ? "w-10 bg-white" : "w-5 bg-white/40 hover:bg-white/70",
                )}
              />
            ))}
          </div>
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t("action.prev")}
              className="rounded-full border border-white/50 p-2 text-white transition-colors hover:border-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t("action.next")}
              className="rounded-full border border-white/50 p-2 text-white transition-colors hover:border-white hover:bg-white/10"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
