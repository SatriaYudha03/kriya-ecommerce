"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Media produk: memakai foto asli (next/image) bila src berupa URL remote
// (mis. Supabase Storage saat API live); selama M1/fixtures belum ada foto,
// menampilkan placeholder monogram hangat yang deterministik per produk.
// Komponen mengisi penuh parent — parent yang mengatur rasio (relative + aspect).

const palettes: [string, string, string][] = [
  ["#f3ddc9", "#c2673f", "#7a3f25"],
  ["#ece0cb", "#b98a4e", "#6b4a1f"],
  ["#e8e2d6", "#9c8f7a", "#544a3b"],
  ["#f0dacf", "#c76b5a", "#7a3327"],
  ["#e4dfd2", "#a9a08a", "#5f5847"],
  ["#efe3d3", "#cf9d63", "#6f4a1e"],
];

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

function Monogram({ name, seed }: { name: string; seed: string }) {
  const [bg, mid, ink] = palettes[hash(seed) % palettes.length];
  const label = name.trim().split(/\s+/)[0];
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex items-center justify-center"
      style={{ backgroundImage: `linear-gradient(135deg, ${bg}, ${mid})` }}
    >
      <span
        className="px-4 text-center text-2xl font-semibold tracking-[0.15em] uppercase sm:text-3xl"
        style={{ color: ink, opacity: 0.9 }}
      >
        {label}
      </span>
    </div>
  );
}

export function ProductMedia({
  name,
  src,
  seed,
  className,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  priority,
}: {
  name: string;
  src?: string;
  seed?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const isRemote = !!src && /^https?:\/\//.test(src);

  if (isRemote && !failed) {
    return (
      <Image
        src={src!}
        alt={name}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", className)}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className={cn("absolute inset-0", className)}>
      <Monogram name={name} seed={seed ?? name} />
    </div>
  );
}
