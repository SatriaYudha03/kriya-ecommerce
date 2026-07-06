"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Paginasi berbasis meta {page, limit, total} (kontrak list KRIYA-MASTER).
export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label="Paginasi" className="flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        aria-label="Halaman sebelumnya"
        className="rounded-full border border-neutral-300 p-2 text-neutral-600 hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPage(p)}
          aria-current={p === page ? "page" : undefined}
          className={cn(
            "h-9 min-w-9 rounded-full px-3 text-sm transition-colors",
            p === page
              ? "bg-neutral-900 text-white"
              : "text-neutral-600 hover:bg-neutral-100",
          )}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        aria-label="Halaman berikutnya"
        className="rounded-full border border-neutral-300 p-2 text-neutral-600 hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
