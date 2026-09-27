"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useAuth } from "@/components/kriya/auth-provider";
import { useWishlist } from "@/lib/customer/queries";
import { useLanguage } from "@/components/kriya/language-provider";
import { buttonVariants } from "@/components/ui/button";

export function WishlistNavButton() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: wishlist } = useWishlist(!!user);

  const count = wishlist?.items.length ?? 0;

  return (
    <Link 
      href={user ? "/account/wishlist" : "/login?next=/account/wishlist"}
      className={buttonVariants({ variant: "ghost", size: "icon", className: "relative" })}
      aria-label={`${t("customer.wishlist.badge")}${count > 0 ? ` (${count})` : ""}`}
    >
      <Heart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {count}
        </span>
      )}
      <span className="sr-only">{t("customer.wishlist.badge")}</span>
    </Link>
  );
}
