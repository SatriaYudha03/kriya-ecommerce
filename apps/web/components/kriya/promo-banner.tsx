"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock, Percent } from "lucide-react";

// Banner penawaran (gaya "deal of the day" anon) dengan hitung mundur ke tengah
// malam. Countdown dihitung setelah mount agar tidak ada mismatch hidrasi.
function useCountdownToMidnight() {
  const [left, setLeft] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(24, 0, 0, 0);
      const diff = Math.max(0, end.getTime() - now.getTime());
      const h = Math.floor(diff / 3.6e6);
      const m = Math.floor((diff % 3.6e6) / 6e4);
      const s = Math.floor((diff % 6e4) / 1000);
      const pad = (n: number) => String(n).padStart(2, "0");
      setLeft(`${pad(h)}:${pad(m)}:${pad(s)}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return left;
}

export function PromoBanner() {
  const left = useCountdownToMidnight();
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col items-start gap-6 overflow-hidden rounded-3xl bg-clay px-6 py-10 text-cream sm:px-10 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-cream/15 px-3 py-1 text-xs font-medium tracking-wide">
            <Percent className="h-3.5 w-3.5" />
            Penawaran hari ini
          </span>
          <h2 className="mt-4 max-w-lg text-2xl font-semibold tracking-tight sm:text-3xl">
            Hemat hingga 20% untuk set ruang kerja
          </h2>
          <p className="mt-2 max-w-md text-sm text-cream/80">
            Meja, kursi, dan penyimpanan pilihan. Berlaku terbatas.
          </p>
        </div>
        <div className="flex flex-col items-start gap-4 md:items-end">
          <div className="inline-flex items-center gap-2 rounded-xl bg-cream/10 px-4 py-2 font-mono text-lg tabular-nums">
            <Clock className="h-4 w-4" />
            {left ?? "--:--:--"}
          </div>
          <Link
            href="/kategori/workspace"
            className="rounded-full bg-cream px-6 py-3 text-sm font-medium text-clay transition-colors hover:bg-white"
          >
            Belanja ruang kerja
          </Link>
        </div>
      </div>
    </section>
  );
}
