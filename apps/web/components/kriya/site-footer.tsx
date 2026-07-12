"use client";

import Link from "next/link";
import type { Category } from "@/lib/types";
import { categoryLabel } from "@/lib/category-meta";
import { Newsletter } from "./newsletter";
import { useLanguage } from "./language-provider";

// Footer toko: kolom belanja + bantuan + langganan (gaya anon), Bahasa Indonesia.
export function SiteFooter({ categories }: { categories: Category[] }) {
  const { t } = useLanguage();
  return (
    <footer className="mt-16 border-t border-neutral-200 bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <p className="text-xl font-semibold tracking-tight text-neutral-900">KRIYA</p>
            <p className="mt-3 max-w-xs text-sm text-neutral-500">
              {t("footer.tagline")}
            </p>
            <div className="mt-4 flex gap-4 text-sm text-neutral-500">
              <a href="#" className="hover:text-neutral-900">Instagram</a>
              <a href="#" className="hover:text-neutral-900">TikTok</a>
              <a href="#" className="hover:text-neutral-900">Email</a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-900">{t("footer.shop")}</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-500">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/categories/${c.slug}`} className="hover:text-neutral-900">
                    {categoryLabel(c.slug, c.name)}
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
            <h3 className="text-sm font-semibold text-neutral-900">{t("footer.newsletter.title")}</h3>
            <p className="mt-4 text-sm text-neutral-500">
              {t("footer.newsletter.desc")}
            </p>
            <div className="mt-4">
              <Newsletter />
            </div>
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
