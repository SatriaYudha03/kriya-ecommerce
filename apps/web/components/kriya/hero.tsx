"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Slide {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: { label: string; href: string };
  image: string;
  alt: string;
  gradient: string;
}

import { useLanguage } from "./language-provider";

export function Hero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const { t } = useLanguage();

  const slides: Slide[] = [
    {
      eyebrow: t("home.hero.eyebrow1" as any),
      title: t("home.hero.title1" as any),
      subtitle: t("home.hero.subtitle1" as any),
      cta: { label: t("home.hero.cta1" as any), href: "/categories/living-room" },
      image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80&auto=format&fit=crop",
      alt: "Sofa modern di ruang keluarga yang hangat",
      gradient: "from-brand-tint to-brand-soft",
    },
    {
      eyebrow: t("home.hero.eyebrow2" as any),
      title: t("home.hero.title2" as any),
      subtitle: t("home.hero.subtitle2" as any),
      cta: { label: t("home.hero.cta2" as any), href: "/categories/workspace" },
      image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80&auto=format&fit=crop",
      alt: "Meja kerja minimalis dengan pencahayaan alami",
      gradient: "from-cream to-sand",
    },
    {
      eyebrow: t("home.hero.eyebrow3" as any),
      title: t("home.hero.title3" as any),
      subtitle: t("home.hero.subtitle3" as any),
      cta: { label: t("home.hero.cta3" as any), href: "/categories/lighting" },
      image: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&q=80&auto=format&fit=crop",
      alt: "Lampu lantai dengan cahaya hangat di sudut ruangan",
      gradient: "from-cream to-brand-tint",
    },
  ];

  const count = slides.length;

  const go = useCallback((n: number) => setIndex((i) => (i + n + count) % count), [count]);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(t);
  }, [paused, count]);

  const slide = slides[index];

  return (
    <section
      className="mx-auto max-w-6xl px-4 pt-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="grid items-center gap-8 rounded-3xl bg-cream p-6 sm:p-10 lg:grid-cols-2">
        <div key={index} className="animate-in fade-in slide-in-from-bottom-2 duration-700">
          <p className="text-sm font-medium tracking-widest text-brand uppercase">
            {slide.eyebrow}
          </p>
          <h1 className="mt-3 text-4xl leading-tight font-semibold tracking-tight text-neutral-900 sm:text-5xl">
            {slide.title}
          </h1>
          <p className="mt-4 max-w-md text-lg text-neutral-600">{slide.subtitle}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={slide.cta.href}
              className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
            >
              {slide.cta.label}
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-400"
            >
              <Search className="h-4 w-4" />
              {t("nav.search")}
            </Link>
          </div>
        </div>

        <div className="relative order-first lg:order-last">
          <div
            key={index}
            className={cn(
              "relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-black/5",
              "animate-in fade-in duration-700",
            )}
          >
            <Image
              src={slide.image}
              alt={slide.alt}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              priority={index === 0}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label={t("action.prev")}
          className="rounded-full border border-neutral-300 p-2 text-neutral-600 hover:border-neutral-400"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "h-2 rounded-full transition-all",
                i === index ? "w-6 bg-brand" : "w-2 bg-neutral-300 hover:bg-neutral-400",
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label={t("action.next")}
          className="rounded-full border border-neutral-300 p-2 text-neutral-600 hover:border-neutral-400"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
