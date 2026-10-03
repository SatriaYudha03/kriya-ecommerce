"use client";

import { Check, ChevronDown, Globe } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useLanguage } from "./language-provider";

const LANGUAGES: { value: Locale; label: string }[] = [
  { value: "id", label: "Indonesia" },
  { value: "en", label: "English" },
];

// Bar pengumuman tipis di atas header: promo di tengah, pemilih bahasa di kanan.
// Non-sticky — ikut tergulung, header di bawahnya yang menempel.
export function TopBar() {
  const { t, locale, setLocale } = useLanguage();
  const current = LANGUAGES.find((l) => l.value === locale) ?? LANGUAGES[0];

  return (
    <div className="bg-espresso text-cream">
      <div className="mx-auto grid h-9 max-w-7xl grid-cols-[1fr_auto] items-center gap-4 px-4 text-xs sm:grid-cols-[1fr_auto_1fr] sm:px-6 lg:px-10">
        <span className="hidden sm:block" />
        <p className="truncate text-left text-cream/90 sm:text-center">{t("topbar.promo")}</p>

        {/* Dropdown hover/focus murni CSS — tanpa state, tetap bisa via keyboard. */}
        <div className="group relative justify-self-end">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-label={t("nav.language")}
            className="flex items-center gap-1.5 py-2 font-medium text-cream/90 hover:text-white"
          >
            <Globe className="h-3.5 w-3.5" />
            {current.label}
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-focus-within:rotate-180 group-hover:rotate-180" />
          </button>
          <ul
            role="listbox"
            aria-label={t("nav.language")}
            className="invisible absolute top-full right-0 z-50 min-w-36 translate-y-1 rounded-md bg-white py-1 text-neutral-800 opacity-0 shadow-lg ring-1 ring-black/5 transition-all group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
          >
            {LANGUAGES.map((l) => (
              <li key={l.value} role="option" aria-selected={l.value === locale}>
                <button
                  type="button"
                  onClick={(e) => {
                    if (l.value !== locale) setLocale(l.value);
                    e.currentTarget.blur();
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-sand",
                    l.value === locale && "font-semibold text-brand-strong",
                  )}
                >
                  {l.label}
                  {l.value === locale && <Check className="h-3.5 w-3.5" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
