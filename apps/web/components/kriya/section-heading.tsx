import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Judul seksi dengan link "lihat semua" opsional.
export function SectionHeading({
  title,
  subtitle,
  href,
  linkLabel = "Lihat semua",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-strong hover:gap-2"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
