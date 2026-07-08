import type { NextConfig } from "next";

// Host Supabase Storage untuk next/image (remotePatterns — bukan images.domains
// yang sudah deprecated di Next 16). M1 memakai placeholder monogram; konfigurasi
// ini menyiapkan agar foto produk live tampil begitu Storage terisi.
const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : undefined;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost ?? "**.supabase.co",
        pathname: "/storage/v1/object/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
