"use client";

import { useState } from "react";
import { useMyReviewables, useMyReviews, useCreateReview, useUpdateReview } from "@/lib/aftersales/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RatingStars } from "@/components/kriya/catalog/rating-stars";
import { Pagination } from "@/components/kriya/pagination";
import Image from "next/image";
import type { OrderItem, Review } from "@/lib/aftersales/types";
import { Star } from "lucide-react";

export function MyReviews() {
  const [activeTab, setActiveTab] = useState("reviewable");
  const [page, setPage] = useState(1);

  const { data: reviewables, isLoading: loadingReviewables } = useMyReviewables(page, 10);
  const { data: reviews, isLoading: loadingReviews } = useMyReviews(page, 10);

  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; item?: OrderItem; review?: Review }>({ open: false });

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="reviewable">Menunggu Ulasan</TabsTrigger>
          <TabsTrigger value="reviewed">Ulasan Saya</TabsTrigger>
        </TabsList>

        <TabsContent value="reviewable" className="space-y-4 mt-6">
          {loadingReviewables ? (
            <div className="text-center py-4">Memuat...</div>
          ) : reviewables?.data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
              Tidak ada produk yang menunggu ulasan.
            </div>
          ) : (
            <div className="space-y-4">
              {reviewables?.data.map((item) => (
                <div key={item.id} className="flex gap-4 p-4 border rounded-lg items-center">
                  <div className="relative w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                    {item.thumbnail_url && (
                      <Image src={item.thumbnail_url} alt={item.name} fill className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.name}</div>
                    <div className="text-sm text-muted-foreground">Varian: {item.color}</div>
                  </div>
                  <Button onClick={() => setReviewDialog({ open: true, item })}>
                    Tulis Ulasan
                  </Button>
                </div>
              ))}
              {reviewables?.meta && reviewables.meta.total > 10 && (
                <Pagination page={page} totalPages={Math.ceil(reviewables.meta.total / 10)} onPage={setPage} />
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviewed" className="space-y-4 mt-6">
          {loadingReviews ? (
            <div className="text-center py-4">Memuat...</div>
          ) : reviews?.data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
              Belum ada ulasan yang ditulis.
            </div>
          ) : (
            <div className="space-y-4">
              {reviews?.data.map((review) => (
                <div key={review.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium truncate">{review.product_name}</div>
                      <div className="text-sm text-muted-foreground">Varian: {review.variant_name}</div>
                    </div>
                    <div className="flex flex-col items-end">
                      <RatingStars value={review.rating} size="sm" />
                      <span className="text-xs text-muted-foreground uppercase mt-1 px-2 py-0.5 bg-muted rounded">
                        {review.status}
                      </span>
                    </div>
                  </div>
                  {review.title && <div className="font-medium">{review.title}</div>}
                  {review.body && <div className="text-sm text-muted-foreground">{review.body}</div>}
                  {review.admin_reply && (
                    <div className="text-sm bg-muted/50 p-3 rounded">
                      <span className="font-medium">Kriya: </span>
                      <span className="text-muted-foreground">{review.admin_reply}</span>
                    </div>
                  )}
                  <div className="pt-2">
                    <Button variant="outline" size="sm" onClick={() => setReviewDialog({ open: true, review })}>
                      Edit Ulasan
                    </Button>
                  </div>
                </div>
              ))}
              {reviews?.meta && reviews.meta.total > 10 && (
                <Pagination page={page} totalPages={Math.ceil(reviews.meta.total / 10)} onPage={setPage} />
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ReviewDialog 
        open={reviewDialog.open} 
        onOpenChange={(open) => setReviewDialog((prev) => ({ ...prev, open }))}
        item={reviewDialog.item}
        review={reviewDialog.review}
      />
    </div>
  );
}

function ReviewDialog({ open, onOpenChange, item, review }: { open: boolean, onOpenChange: (o: boolean) => void, item?: OrderItem, review?: Review }) {
  const [rating, setRating] = useState(review?.rating || 5);
  const [title, setTitle] = useState(review?.title || "");
  const [body, setBody] = useState(review?.body || "");
  
  const createMut = useCreateReview();
  const updateMut = useUpdateReview();
  
  // reset on open
  if (open && rating === 0 && !review) {
    setRating(5);
    setTitle("");
    setBody("");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (review) {
      updateMut.mutate({ id: review.id, req: { rating, title, body } }, {
        onSuccess: () => onOpenChange(false)
      });
    } else if (item) {
      createMut.mutate({ order_item_id: item.id, rating, title, body }, {
        onSuccess: () => onOpenChange(false)
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{review ? "Edit Ulasan" : "Tulis Ulasan"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setRating(val)}
                className="focus:outline-none"
              >
                <Star
                  className={`w-8 h-8 ${val <= rating ? "fill-primary text-primary" : "text-muted"}`}
                />
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Judul (opsional)</label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Ringkasan ulasan Anda"
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Ulasan (opsional)</label>
            <Textarea 
              value={body} 
              onChange={(e) => setBody(e.target.value)} 
              placeholder="Ceritakan pengalaman Anda dengan produk ini"
              rows={4}
              maxLength={2000}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
              Kirim
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
