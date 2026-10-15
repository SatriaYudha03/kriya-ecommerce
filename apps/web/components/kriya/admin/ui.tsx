"use client";

// Kit UI panel admin — bahasa visual ala Shopify Polaris: halaman abu-abu,
// kartu putih bersudut 12px, input bergaris tegas, tombol utama gelap, badge
// bernada. SEMUA halaman admin wajib memakai komponen di sini (bukan kelas
// Tailwind lepas) supaya tampilan tiap modul konsisten.

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ImageIcon,
  Info,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useLanguage } from "@/components/kriya/language-provider";
import { cn } from "@/lib/utils";

type IconType = React.ComponentType<{ className?: string }>;

const FOCUS_RING = "outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-admin-focus";

/* ------------------------------------------------------------------ Button */

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "plain" | "critical";
export type ButtonSize = "slim" | "medium" | "icon" | "icon-slim";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[#303030] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22),inset_0_-1px_0_0_#000,0_0_0_1px_#303030] hover:bg-[#1a1a1a] active:bg-black",
  secondary:
    "bg-white text-admin-text shadow-[inset_0_-1px_0_0_#b5b5b5,inset_0_0_0_1px_rgba(0,0,0,0.12)] hover:bg-admin-subdued active:bg-admin-hover active:shadow-[inset_0_1px_1px_0_rgba(0,0,0,0.18)]",
  tertiary: "bg-transparent text-admin-text hover:bg-black/[0.06] active:bg-black/10",
  plain: "bg-transparent px-0! h-auto! font-medium text-admin-link hover:underline",
  critical:
    "bg-[#c70a24] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),inset_0_-1px_0_0_#8e0b21,0_0_0_1px_#a3081d] hover:bg-[#a3081d]",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  slim: "h-7 gap-1 px-2.5 text-xs [&_svg]:size-3.5",
  medium: "h-8 gap-1.5 px-3 text-[13px] [&_svg]:size-4",
  icon: "size-8 [&_svg]:size-4",
  "icon-slim": "size-7 [&_svg]:size-4",
};

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "medium", className?: string) {
  return cn(
    "inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
    FOCUS_RING,
    BUTTON_SIZES[size],
    BUTTON_VARIANTS[variant],
    className,
  );
}

type ButtonStyleProps = { variant?: ButtonVariant; size?: ButtonSize };

export function Button({
  variant,
  size,
  loading,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & ButtonStyleProps & { loading?: boolean }) {
  return (
    <button type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...props}>
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: React.ComponentProps<typeof Link> & ButtonStyleProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/* -------------------------------------------------------- Page & layout */

const PAGE_WIDTH = {
  narrow: "max-w-[42rem]",
  default: "max-w-[62rem]",
  wide: "max-w-[76rem]",
  full: "max-w-[88rem]",
} as const;

export function Page({
  width = "default",
  className,
  children,
}: {
  width?: keyof typeof PAGE_WIDTH;
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("mx-auto w-full pb-16", PAGE_WIDTH[width], className)}>{children}</div>;
}

// Judul halaman ala Shopify: ikon modul (jadi tautan balik di halaman detail)
// › judul, badge status di samping, tombol aksi di kanan.
export function PageHeader({
  title,
  icon: Icon,
  backHref,
  backLabel,
  badge,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  icon?: IconType;
  backHref?: string;
  backLabel?: string;
  badge?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex min-h-8 min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
          {backHref ? (
            <>
              <Link
                href={backHref}
                aria-label={backLabel}
                title={backLabel}
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg text-[#4a4a4a] hover:bg-black/[0.06]",
                  FOCUS_RING,
                )}
              >
                {Icon ? <Icon className="size-[18px]" /> : <ChevronLeft className="size-[18px]" />}
              </Link>
              <ChevronRight className="size-4 shrink-0 text-admin-faint" aria-hidden />
            </>
          ) : (
            Icon && <Icon className="mr-0.5 size-5 shrink-0 text-[#4a4a4a]" />
          )}
          <h1 className="min-w-0 truncate text-xl font-bold tracking-tight text-admin-text">{title}</h1>
          {badge}
        </div>
        {subtitle && <div className="mt-1 text-[13px] text-admin-muted">{subtitle}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

// Tata letak dua kolom halaman detail/form: konten utama + kolom samping 20rem.
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">{children}</div>
  );
}

export function LayoutMain({ children }: { children: React.ReactNode }) {
  return <div className="min-w-0 space-y-4">{children}</div>;
}

export function LayoutAside({ children }: { children: React.ReactNode }) {
  return <div className="min-w-0 space-y-4">{children}</div>;
}

// Bagian pengaturan bergaya "annotated section" Shopify: judul + penjelasan
// di kiri, kartu isian di kanan (bertumpuk di layar kecil).
export function AnnotatedSection({
  title,
  description,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="grid grid-cols-1 gap-3 border-b border-[#d4d4d4] py-5 first:pt-0 last:border-0 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-6">
      <div>
        <h2 className="text-sm font-semibold text-admin-text">{title}</h2>
        {description && <p className="mt-1 text-[13px] leading-5 text-admin-muted">{description}</p>}
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

/* -------------------------------------------------------------------- Card */

export function Card({
  title,
  description,
  action,
  footer,
  flush,
  className,
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  // flush: isi menempel ke tepi kartu (tabel, daftar), tanpa padding.
  flush?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const hasHeader = Boolean(title || action);
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl bg-white shadow-[0_1px_0_0_rgba(26,26,26,0.07),0_0_0_1px_rgba(0,0,0,0.07)]",
        className,
      )}
    >
      {hasHeader && (
        <div className={cn("flex items-start justify-between gap-3 px-4 pt-4", flush ? "pb-3" : "pb-0")}>
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-admin-text">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-admin-muted">{description}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}
      {children !== undefined && children !== null && (
        <div className={cn(!flush && "p-4", !flush && hasHeader && "pt-3")}>{children}</div>
      )}
      {footer && <div className="border-t border-admin-border bg-admin-subdued px-4 py-3 text-[13px] text-admin-muted">{footer}</div>}
    </section>
  );
}

// Bagian tambahan di dalam kartu, dipisah garis tipis.
export function CardSection({
  title,
  action,
  subdued,
  className,
  children,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  subdued?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("border-t border-admin-border p-4", subdued && "bg-admin-subdued", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h3 className="text-[13px] font-semibold text-admin-text">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/* ------------------------------------------------------------ Form fields */

const INPUT_BASE =
  "w-full min-w-0 rounded-lg border border-admin-input bg-white text-[13px] text-admin-text placeholder:text-admin-faint transition-colors hover:border-[#616161] focus:border-admin-text focus:outline-2 focus:outline-offset-1 focus:outline-admin-focus disabled:cursor-not-allowed disabled:border-admin-border disabled:bg-admin-subdued disabled:text-admin-faint aria-invalid:border-[#c70a24] aria-invalid:bg-[#fff4f4]";

export function Field({
  label,
  htmlFor,
  help,
  error,
  labelAction,
  className,
  children,
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  help?: React.ReactNode;
  error?: React.ReactNode;
  labelAction?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      {(label || labelAction) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label htmlFor={htmlFor} className="block text-[13px] text-admin-text">
              {label}
            </label>
          )}
          {labelAction}
        </div>
      )}
      {children}
      {help && !error && <p className="text-xs leading-5 text-admin-muted">{help}</p>}
      {error && (
        <p className="flex items-center gap-1 text-xs text-admin-critical">
          <AlertCircle className="size-3.5" /> {error}
        </p>
      )}
    </div>
  );
}

export function FormGrid({ cols = 2, className, children }: { cols?: 2 | 3; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("grid grid-cols-1 gap-4", cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3", className)}>
      {children}
    </div>
  );
}

export function TextInput({
  prefix,
  suffix,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "prefix"> & { prefix?: React.ReactNode; suffix?: React.ReactNode }) {
  if (!prefix && !suffix) return <input className={cn(INPUT_BASE, "h-9 px-3", className)} {...props} />;
  return (
    <div
      className={cn(
        "flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-admin-input bg-white px-3 transition-colors hover:border-[#616161] focus-within:border-admin-text focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-admin-focus",
        props.disabled && "border-admin-border bg-admin-subdued",
        className,
      )}
    >
      {prefix && <span className="shrink-0 text-[13px] text-admin-muted">{prefix}</span>}
      <input
        className="h-full w-full min-w-0 flex-1 bg-transparent text-[13px] text-admin-text outline-none placeholder:text-admin-faint disabled:cursor-not-allowed"
        {...props}
      />
      {suffix && <span className="shrink-0 text-[13px] text-admin-muted">{suffix}</span>}
    </div>
  );
}

export function SearchInput({ className, ...props }: Omit<React.ComponentProps<"input">, "prefix" | "type">) {
  return (
    <TextInput
      type="search"
      prefix={<Search className="size-4 text-admin-muted" />}
      className={cn("h-8 bg-white", className)}
      {...props}
    />
  );
}

export function SelectInput({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <select className={cn(INPUT_BASE, "h-9 cursor-pointer appearance-none pl-3 pr-9")} {...props}>
        {children}
      </select>
      <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[#4a4a4a]" />
    </div>
  );
}

export function TextArea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(INPUT_BASE, "min-h-24 px-3 py-2 leading-5", className)} {...props} />;
}

export function Checkbox({
  label,
  help,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & { label: React.ReactNode; help?: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2", props.disabled && "cursor-not-allowed opacity-60", className)}>
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded accent-[#303030] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-admin-focus"
        {...props}
      />
      <span className="min-w-0">
        <span className="block text-[13px] leading-5 text-admin-text">{label}</span>
        {help && <span className="block text-xs leading-5 text-admin-muted">{help}</span>}
      </span>
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        FOCUS_RING,
        checked ? "bg-[#303030]" : "bg-[#cccccc]",
      )}
    >
      <span
        className={cn(
          "inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

// Baris "label ........ [toggle]" seperti "Inventaris dilacak" di Shopify.
export function ToggleRow({
  label,
  help,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  help?: React.ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[13px] text-admin-text">{label}</p>
        {help && <p className="text-xs leading-5 text-admin-muted">{help}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} disabled={disabled} />
    </div>
  );
}

// Chip pilihan (tag/atribut) — gaya "Tambah tag" Shopify.
export function ChoiceChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-[13px] font-medium transition-colors",
        FOCUS_RING,
        selected
          ? "bg-[#303030] text-white hover:bg-[#1a1a1a]"
          : "bg-admin-hover text-admin-text hover:bg-[#e3e3e3]",
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Badge */

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "attention" | "critical" | "magic";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-[#e3e3e3] text-[#4a4a4a]",
  info: "bg-[#d5ebff] text-[#00406b]",
  success: "bg-[#c4f5d4] text-[#0c5132]",
  warning: "bg-[#ffd6a4] text-[#5e4200]",
  attention: "bg-[#fff1a8] text-[#4f4700]",
  critical: "bg-[#fed1d7] text-[#8e0b21]",
  magic: "bg-[#ece3ff] text-[#5700d1]",
};

export type BadgeProgress = "incomplete" | "partial" | "complete";

export function Badge({
  tone = "neutral",
  progress,
  className,
  children,
}: {
  tone?: BadgeTone;
  progress?: BadgeProgress;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 text-xs font-medium",
        BADGE_TONES[tone],
        className,
      )}
    >
      {progress && <ProgressDot progress={progress} />}
      {children}
    </span>
  );
}

function ProgressDot({ progress }: { progress: BadgeProgress }) {
  return (
    <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
      <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {progress === "complete" && <circle cx="5" cy="5" r="4" fill="currentColor" />}
      {progress === "partial" && <path d="M5 1 A4 4 0 0 1 5 9 Z" fill="currentColor" />}
    </svg>
  );
}

/* ------------------------------------------------------------------ Table */

export function DataTable({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-[13px] text-admin-text", className)}>{children}</table>
    </div>
  );
}

type Align = "left" | "right" | "center";
const ALIGN: Record<Align, string> = { left: "text-left", right: "text-right", center: "text-center" };

export function Th({
  align = "left",
  className,
  children,
}: {
  align?: Align;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "h-9 whitespace-nowrap border-b border-admin-border bg-admin-subdued px-3 text-xs font-medium text-admin-muted first:pl-4 last:pr-4",
        ALIGN[align],
        className,
      )}
    >
      {children}
    </th>
  );
}

// Baris tabel; dengan `href` seluruh baris bisa diklik/Enter seperti index
// table Shopify. Tombol/tautan di dalam baris harus stopPropagation.
export function Tr({
  href,
  className,
  children,
  ...props
}: React.ComponentProps<"tr"> & { href?: string }) {
  const router = useRouter();
  const linkProps = href
    ? {
        role: "link" as const,
        tabIndex: 0,
        onClick: () => router.push(href),
        onKeyDown: (e: React.KeyboardEvent<HTMLTableRowElement>) => {
          if (e.key === "Enter") router.push(href);
        },
      }
    : {};
  return (
    <tr
      className={cn(
        "border-b border-admin-border transition-colors last:border-0 hover:bg-admin-subdued",
        href && "cursor-pointer focus-visible:bg-admin-subdued focus-visible:outline-none",
        className,
      )}
      {...linkProps}
      {...props}
    >
      {children}
    </tr>
  );
}

export function Td({
  align = "left",
  className,
  children,
  ...props
}: React.ComponentProps<"td"> & { align?: Align }) {
  return (
    <td className={cn("px-3 py-2.5 align-middle first:pl-4 last:pr-4", ALIGN[align], className)} {...props}>
      {children}
    </td>
  );
}

// Hentikan klik di sel aksi agar tidak ikut memicu navigasi baris.
export function stopRow(e: React.SyntheticEvent) {
  e.stopPropagation();
}

export function SkeletonRows({ rows = 5, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="border-b border-admin-border last:border-0">
          {Array.from({ length: cols }, (_, c) => (
            <td key={c} className="px-3 py-3.5 first:pl-4 last:pr-4">
              <Skeleton className={cn("h-3.5", c === 0 ? "w-40" : "w-20")} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-[#ebebeb]", className)} />;
}

/* --------------------------------------------------------- Index filters */

export interface TabItem<T extends string> {
  value: T;
  label: string;
}

// Tab tampilan di atas tabel (Semua · Aktif · Draf …) seperti index Shopify.
export function FilterTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: TabItem<T>[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto px-2 py-2">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "h-7 shrink-0 rounded-lg px-3 text-[13px] font-medium transition-colors",
              FOCUS_RING,
              active ? "bg-[#e3e3e3] text-admin-text" : "text-admin-muted hover:bg-admin-hover hover:text-admin-text",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// Baris kontrol di atas tabel: tab, pencarian, filter, urutan.
export function IndexToolbar({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-2 border-b border-admin-border px-2 py-2 sm:flex-row sm:items-center", className)}>
      {children}
    </div>
  );
}

// Grup segmented (mis. 7/30/90 hari) — bentuk tombol sekunder bersambung.
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-lg bg-white p-0.5 shadow-[inset_0_-1px_0_0_#b5b5b5,inset_0_0_0_1px_rgba(0,0,0,0.12)]"
    >
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-7 rounded-md px-3 text-[13px] font-medium transition-colors",
            FOCUS_RING,
            o.value === value ? "bg-[#303030] text-white" : "text-admin-muted hover:text-admin-text",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Pager */

export function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  const { t } = useLanguage();
  if (totalPages <= 1) return null;
  return (
    <nav
      aria-label={t("admin.common.pagination")}
      className="flex items-center justify-center gap-3 border-t border-admin-border bg-admin-subdued px-4 py-2"
    >
      <div className="inline-flex">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label={t("admin.common.prev")}
          className={cn(buttonClass("secondary", "icon-slim"), "rounded-r-none")}
        >
          <ChevronLeft />
        </button>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label={t("admin.common.next")}
          className={cn(buttonClass("secondary", "icon-slim"), "-ml-px rounded-l-none")}
        >
          <ChevronRight />
        </button>
      </div>
      <span className="text-xs text-admin-muted tabular-nums">
        {t("admin.common.pageOf", { page, total: totalPages })}
      </span>
    </nav>
  );
}

/* ----------------------------------------------------------------- States */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: IconType;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-admin-hover text-admin-muted">
          <Icon className="size-6" />
        </span>
      )}
      <p className="text-sm font-semibold text-admin-text">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-admin-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ label, className }: { label?: string; className?: string }) {
  const { t } = useLanguage();
  return (
    <div role="status" className={cn("flex items-center justify-center gap-2 py-14 text-[13px] text-admin-muted", className)}>
      <Loader2 className="size-4 animate-spin" /> {label ?? t("admin.common.loading")}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useLanguage();
  return (
    <EmptyState
      icon={AlertCircle}
      title={message ?? t("admin.common.loadError")}
      action={
        onRetry && (
          <Button size="slim" onClick={onRetry}>
            {t("admin.common.retry")}
          </Button>
        )
      }
    />
  );
}

export type BannerTone = "info" | "success" | "warning" | "critical";

const BANNER: Record<BannerTone, { box: string; icon: IconType; iconCls: string }> = {
  info: { box: "bg-[#eaf4ff] border-[#a8d3ff]", icon: Info, iconCls: "text-[#00527c]" },
  success: { box: "bg-[#ebfdf1] border-[#9ce7b6]", icon: CheckCircle2, iconCls: "text-[#0c5132]" },
  warning: { box: "bg-[#fff6e4] border-[#ffcf7c]", icon: AlertTriangle, iconCls: "text-[#5e4200]" },
  critical: { box: "bg-[#fff1f2] border-[#fdb4bc]", icon: AlertCircle, iconCls: "text-[#8e0b21]" },
};

export function Banner({
  tone = "info",
  title,
  action,
  className,
  children,
}: {
  tone?: BannerTone;
  title?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  const { box, icon: Icon, iconCls } = BANNER[tone];
  return (
    <div role={tone === "critical" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border p-3", box, className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", iconCls)} />
      <div className="min-w-0 flex-1 text-[13px] text-admin-text">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5")}>{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Display */

export function Thumbnail({ src, alt, size = "md" }: { src?: string | null; alt: string; size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? "size-8" : size === "lg" ? "size-14" : "size-10";
  return (
    <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-admin-border bg-admin-subdued", dim)}>
      {src ? (
        <Image src={src} alt={alt} fill unoptimized sizes="56px" className="object-cover" />
      ) : (
        <ImageIcon className="size-4 text-[#b5b5b5]" />
      )}
    </span>
  );
}

// Daftar label–nilai untuk kartu ringkasan (pelanggan, alamat, pengiriman).
export function InfoList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <dl className={cn("space-y-3", className)}>{children}</dl>;
}

export function InfoItem({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-admin-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-[13px] text-admin-text">{children}</dd>
    </div>
  );
}

// Baris ringkasan pembayaran: label kiri, angka kanan (tabular).
export function SummaryRow({
  label,
  hint,
  value,
  strong,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 text-[13px]", strong && "font-semibold")}>
      <span className="text-admin-text">
        {label}
        {hint && <span className="ml-2 font-normal text-admin-muted">{hint}</span>}
      </span>
      <span className="shrink-0 tabular-nums text-admin-text">{value}</span>
    </div>
  );
}

export function TextLink({ className, ...props }: React.ComponentProps<typeof Link>) {
  return <Link className={cn("font-medium text-admin-link hover:underline", FOCUS_RING, className)} {...props} />;
}

/* ------------------------------------------------------------------ Modal */

export function Modal({
  open,
  onClose,
  title,
  footer,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  const width = size === "sm" ? "sm:max-w-md" : size === "lg" ? "sm:max-w-3xl" : "sm:max-w-xl";
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/45 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white text-admin-text shadow-2xl outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0",
            width,
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-admin-border bg-[#f3f3f3] py-2.5 pl-4 pr-2">
            <DialogPrimitive.Title className="min-w-0 truncate text-sm font-semibold">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label={t("admin.common.close")} className={buttonClass("tertiary", "icon-slim")}>
              <X />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-4 text-[13px]">{children}</div>
          {footer && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-admin-border px-4 py-3">{footer}</div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  loading,
  tone = "critical",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  loading?: boolean;
  tone?: "critical" | "primary";
}) {
  const { t } = useLanguage();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>{t("admin.common.cancel")}</Button>
          <Button variant={tone} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[13px] leading-5 text-admin-text">{message}</p>
    </Modal>
  );
}

/* ----------------------------------------------------------- Formatting */

export function useAdminFormat() {
  const { locale } = useLanguage();
  const tag = locale === "en" ? "en-US" : "id-ID";
  return {
    date: (iso: string) => new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)),
    dateTime: (iso: string) =>
      new Intl.DateTimeFormat(tag, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso)),
    number: (n: number) => new Intl.NumberFormat(tag).format(n),
  };
}

// Tunda nilai input pencarian agar tidak memicu request per ketukan.
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(h);
  }, [value, delay]);
  return debounced;
}
