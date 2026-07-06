import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";

export const metadata: Metadata = { title: "Pencarian — KRIYA" };

// Placeholder M1: pencarian semantik dibangun di M3 (GET /ai/v1/search).
// Halaman ini menjaga tautan pencarian di header tidak buntu.
type SP = { searchParams: Promise<{ q?: string }> };

export default async function CariPage({ searchParams }: SP) {
  const { q } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint text-brand-strong">
        <Search className="h-6 w-6" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-neutral-900">Pencarian</h1>
      {q && (
        <p className="mt-2 text-neutral-600">
          Kamu mencari <span className="font-medium text-neutral-900">“{q}”</span>.
        </p>
      )}
      <p className="mx-auto mt-3 max-w-md text-sm text-neutral-500">
        Pencarian pintar dengan bahasa sehari-hari hadir pada M3. Sementara ini, jelajahi katalog
        per ruangan lewat menu di atas.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Kembali ke beranda
      </Link>
    </div>
  );
}
