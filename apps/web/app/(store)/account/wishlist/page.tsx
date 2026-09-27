"use client";

import { useAuth } from "@/components/kriya/auth-provider";
import { useWishlist } from "@/lib/customer/queries";
import { ProductCard } from "@/components/kriya/product-card";
import { EmptyState } from "@/components/kriya/empty-state";
import { useLanguage } from "@/components/kriya/language-provider";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function WishlistPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { data: wishlist, isLoading, isError, refetch } = useWishlist(!!user);

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-neutral-100" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-800 my-8">
        <AlertCircle className="mx-auto h-8 w-8 mb-2 text-red-500" />
        <p className="text-sm font-medium">{t("customer.wishlist.loadError")}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 inline-flex items-center rounded-full bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  const items = wishlist?.items ?? [];

  if (items.length === 0) {
    return (
      <EmptyState
        title={t("customer.wishlist.emptyTitle")}
        hint={t("customer.wishlist.emptyHint")}
        action={
          <Link href="/" className={buttonVariants({ variant: "default" })}>
            {t("customer.wishlist.startShopping")}
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("customer.wishlist.title")}</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item) => (
          <ProductCard key={item.id} product={item} />
        ))}
      </div>
    </div>
  );
}
