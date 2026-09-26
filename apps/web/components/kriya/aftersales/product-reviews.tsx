"use client";

import { useState } from "react";
import { useProductReviews, useProductReviewSummary } from "@/lib/aftersales/queries";
import { RatingStars } from "@/components/kriya/catalog/rating-stars";
import { Pagination } from "@/components/kriya/pagination";

export interface ProductReviewsProps {
  productSlug: string;
}

export function ProductReviews({ productSlug }: ProductReviewsProps) {
  const [page, setPage] = useState(1);
  const { data: summary } = useProductReviewSummary(productSlug);
  const { data: reviewsData, isLoading } = useProductReviews(productSlug, "approved", page, 5);

  if (!summary || summary.total_reviews === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Belum ada ulasan untuk produk ini.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Ringkasan & Distribusi */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg min-w-[200px]">
          <span className="text-4xl font-bold">{summary.average_rating.toFixed(1)}</span>
          <RatingStars value={summary.average_rating} count={summary.total_reviews} size="md" />
        </div>
        <div className="flex-1 space-y-2 w-full">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = summary.rating_counts[rating.toString()] || 0;
            const percentage = summary.total_reviews > 0 ? (count / summary.total_reviews) * 100 : 0;
            return (
              <div key={rating} className="flex items-center gap-4 text-sm">
                <span className="w-12">{rating} Bintang</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-right text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daftar Ulasan */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="py-4 text-center">Memuat ulasan...</div>
        ) : (
          reviewsData?.data.map((review) => (
            <div key={review.id} className="border-b pb-6 last:border-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold">{review.user_name || "Pengguna"}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(review.created_at))}
                  </div>
                </div>
                <RatingStars value={review.rating} size="sm" />
              </div>
              {review.title && <h4 className="font-medium mb-1">{review.title}</h4>}
              {review.body && <p className="text-muted-foreground text-sm">{review.body}</p>}
              {review.admin_reply && (
                <div className="mt-4 p-4 bg-muted/50 rounded-md text-sm">
                  <div className="font-semibold mb-1">Balasan dari Kriya</div>
                  <p className="text-muted-foreground">{review.admin_reply}</p>
                </div>
              )}
            </div>
          ))
        )}

        {reviewsData?.meta && reviewsData.meta.total > 5 && (
          <Pagination
            page={page}
            totalPages={Math.ceil(reviewsData.meta.total / 5)}
            onPage={setPage}
          />
        )}
      </div>
    </div>
  );
}
