"use client";

import Link from "next/link";
import type { Category } from "@/lib/types";
import { categoryLabel } from "@/lib/category-meta";
import type { Locale } from "@/lib/i18n";
import { useLanguage } from "./language-provider";

const PAYMENT_SHIPPING: Record<Locale, { title: string; items: string[] }> = {
  id: {
    title: "Pembayaran & Pengiriman",
    items: [
      "Virtual account bank",
      "E-wallet & QRIS",
      "Kartu kredit/debit",
      "Pengiriman ke seluruh Indonesia",
      "Kurir terpercaya, bisa dilacak",
    ],
  },
  en: {
    title: "Payment & Shipping",
    items: [
      "Bank virtual account",
      "E-wallet & QRIS",
      "Credit/debit card",
      "Delivery across Indonesia",
      "Trusted couriers, trackable",
    ],
  },
};

// Footer toko: kolom belanja + bantuan + pembayaran & pengiriman (gaya anon).
export function SiteFooter({ categories }: { categories: Category[] }) {
  const { t, locale } = useLanguage();
  const pay = PAYMENT_SHIPPING[locale];
  return (
    <footer className="mt-16 border-t border-neutral-200 bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid grid-cols-2 gap-x-6 gap-y-16 md:grid-cols-4 md:gap-10">
          <div className="md:col-span-1">
            <p className="text-xl font-semibold tracking-tight text-neutral-900">KRIYA</p>
            <p className="mt-3 max-w-xs text-sm text-neutral-500">
              {t("footer.tagline")}
            </p>
            <div className="mt-4 flex gap-4 text-neutral-500">
              <a href="#" aria-label="Instagram" className="hover:text-neutral-900">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
                </svg>
              </a>
              <a href="#" aria-label="TikTok" className="hover:text-neutral-900">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
                  <path d="M14 3c.3 2.4 2 4.2 4.5 4.5" />
                </svg>
              </a>
              <a href="#" aria-label="Email" className="hover:text-neutral-900">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-900">{t("footer.shop")}</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-500">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/categories/${c.slug}`} className="hover:text-neutral-900">
                    {categoryLabel(c.slug, c.name, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-900">{t("footer.help")}</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-500">
              <li><Link href="/search" className="hover:text-neutral-900">{t("footer.help.search")}</Link></li>
              <li><a href="#" className="hover:text-neutral-900">{t("footer.help.guide")}</a></li>
              <li><a href="#" className="hover:text-neutral-900">{t("footer.help.shipping")}</a></li>
              <li><a href="#" className="hover:text-neutral-900">{t("footer.help.track")}</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-900">{pay.title}</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-500">
              {pay.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-neutral-200 pt-6 text-xs text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.copyright")}</p>
          <p>{t("footer.midtrans")}</p>
        </div>
      </div>
    </footer>
  );
}
