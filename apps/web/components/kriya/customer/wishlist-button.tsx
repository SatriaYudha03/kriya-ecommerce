"use client";

import { usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useAuth } from "@/components/kriya/auth-provider";
import { useWishlist, useWishlistMutations } from "@/lib/customer/queries";
import { useLanguage } from "@/components/kriya/language-provider";
import { Button } from "@/components/ui/button";

export interface WishlistButtonProps {
  productId: string;
  variant?: "icon" | "full";
}

export function WishlistButton({ productId, variant = "icon" }: WishlistButtonProps) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  const { data: wishlist } = useWishlist(!!user);
  const { add, remove } = useWishlistMutations();

  const isInWishlist = wishlist?.items.some((item) => item.id === productId) ?? false;
  const isPending = add.isPending || remove.isPending;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (isInWishlist) {
      remove.mutate(productId);
    } else {
      add.mutate(productId);
    }
  };

  const actionText = isInWishlist ? t("customer.wishlist.remove") : t("customer.wishlist.add");

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        disabled={isPending}
        className={isInWishlist ? "text-red-500 hover:text-red-600" : "text-muted-foreground"}
        aria-label={actionText}
        title={actionText}
      >
        <Heart className={isInWishlist ? "fill-current" : ""} />
        <span className="sr-only">{actionText}</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={isPending}
      className={isInWishlist ? "text-red-600 border-red-200 bg-red-50 hover:bg-red-100" : ""}
      aria-label={actionText}
    >
      <Heart className={`mr-2 h-4 w-4 ${isInWishlist ? "fill-current" : ""}`} />
      {actionText}
    </Button>
  );
}
