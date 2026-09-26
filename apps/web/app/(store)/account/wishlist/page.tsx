"use client";

import { useAuth } from "@/components/kriya/auth-provider";
import { useWishlist } from "@/lib/customer/queries";
import { ProductCard } from "@/components/kriya/product-card";
import { EmptyState } from "@/components/kriya/empty-state";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function WishlistPage() {
  const { user, loading } = useAuth();
  const { data: wishlist, isLoading } = useWishlist(!!user);

  if (loading || isLoading) {
    return <div className="py-8 text-center">Memuat wishlist...</div>;
  }

  const items = wishlist?.items ?? [];

  if (items.length === 0) {
    return (
      <EmptyState
        title="Wishlist Kosong"
        hint="Anda belum menambahkan produk apa pun ke wishlist."
        action={
          <Link href="/" className={buttonVariants({ variant: "default" })}>
            Mulai Belanja
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Wishlist Saya</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item) => (
          <ProductCard key={item.id} product={item} />
        ))}
      </div>
    </div>
  );
}
