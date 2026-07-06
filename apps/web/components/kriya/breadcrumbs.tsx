import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-neutral-500">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {item.href && !last ? (
              <Link href={item.href} className="hover:text-neutral-900">
                {item.label}
              </Link>
            ) : (
              <span className={last ? "text-neutral-900" : undefined}>{item.label}</span>
            )}
            {!last && <ChevronRight className="h-3.5 w-3.5 text-neutral-300" />}
          </span>
        );
      })}
    </nav>
  );
}
