import { PackageOpen } from "lucide-react";

// State kosong generik untuk halaman data (AGENT-FE: state kosong semua halaman).
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-cream/60 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint text-brand-strong">
        <PackageOpen className="h-6 w-6" />
      </span>
      <p className="mt-4 text-base font-medium text-neutral-900">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-neutral-500">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
