"use client";

import { useState } from "react";
import { useAdminReviews, useAdminUpdateReview } from "@/lib/aftersales/queries";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RatingStars } from "@/components/kriya/catalog/rating-stars";
import { Pagination } from "@/components/kriya/pagination";
import type { Review, ReviewStatus } from "@/lib/aftersales/types";

export function AdminReviews() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("pending");
  const { data: reviews, isLoading } = useAdminReviews(status as ReviewStatus, page, 20);

  const [replyDialog, setReplyDialog] = useState<{ open: boolean; review?: Review }>({ open: false });

  const updateMut = useAdminUpdateReview();

  const handleStatusChange = (reviewId: string, newStatus: ReviewStatus) => {
    updateMut.mutate({ id: reviewId, req: { status: newStatus } });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Select value={status} onValueChange={(v) => { setStatus(v || "pending"); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Menunggu Moderasi</SelectItem>
            <SelectItem value="approved">Disetujui</SelectItem>
            <SelectItem value="rejected">Ditolak</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Memuat...</div>
      ) : reviews?.data.length === 0 ? (
        <div className="text-center py-12 border rounded-lg text-muted-foreground">
          Tidak ada ulasan dengan status ini.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Ulasan & Produk</th>
                <th className="px-4 py-3 font-medium">Pengguna</th>
                <th className="px-4 py-3 font-medium">Status & Balasan</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reviews?.data.map((review) => (
                <tr key={review.id} className="bg-background">
                  <td className="px-4 py-3 max-w-[300px]">
                    <div className="font-medium truncate mb-1" title={review.product_name}>
                      {review.product_name}
                    </div>
                    <RatingStars value={review.rating} size="sm" />
                    {review.title && <div className="font-medium mt-2">{review.title}</div>}
                    {review.body && <div className="text-muted-foreground line-clamp-3 mt-1">{review.body}</div>}
                  </td>
                  <td className="px-4 py-3 align-top whitespace-nowrap">
                    <div>{review.user_name}</div>
                    <div className="text-muted-foreground text-xs mt-1">
                      {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "2-digit" }).format(new Date(review.created_at))}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="uppercase text-xs font-semibold px-2 py-0.5 bg-muted rounded">
                      {review.status}
                    </span>
                    {review.admin_reply && (
                      <div className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded line-clamp-2" title={review.admin_reply}>
                        {review.admin_reply}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-right space-x-2 whitespace-nowrap">
                    {review.status === "pending" && (
                      <>
                        <Button variant="outline" size="sm" className="text-green-600" onClick={() => handleStatusChange(review.id, "approved")} disabled={updateMut.isPending}>Setujui</Button>
                        <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleStatusChange(review.id, "rejected")} disabled={updateMut.isPending}>Tolak</Button>
                      </>
                    )}
                    {(review.status === "approved" || review.status === "rejected") && (
                      <Button variant="outline" size="sm" onClick={() => handleStatusChange(review.id, "pending")} disabled={updateMut.isPending}>Reset</Button>
                    )}
                    <Button variant="default" size="sm" onClick={() => setReplyDialog({ open: true, review })}>Balas</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reviews?.meta && reviews.meta.total > 20 && (
        <Pagination page={page} totalPages={Math.ceil(reviews.meta.total / 20)} onPage={setPage} />
      )}

      <AdminReplyDialog 
        open={replyDialog.open} 
        onOpenChange={(open) => setReplyDialog((prev) => ({ ...prev, open }))}
        review={replyDialog.review}
      />
    </div>
  );
}

function AdminReplyDialog({ open, onOpenChange, review }: { open: boolean, onOpenChange: (o: boolean) => void, review?: Review }) {
  const [reply, setReply] = useState(review?.admin_reply || "");
  const updateMut = useAdminUpdateReview();

  if (open && review && reply === "" && !review.admin_reply) {
    setReply("");
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (review) {
      updateMut.mutate({ id: review.id, req: { admin_reply: reply } }, {
        onSuccess: () => onOpenChange(false)
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Balas Ulasan</DialogTitle>
        </DialogHeader>
        <div className="p-4 bg-muted/30 rounded-md text-sm mb-4">
          <div className="font-semibold mb-1">{review?.title}</div>
          <div>{review?.body}</div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Balasan Anda</label>
            <Textarea 
              value={reply} 
              onChange={(e) => setReply(e.target.value)} 
              placeholder="Tulis balasan publik untuk pengguna ini"
              rows={4}
              maxLength={2000}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={updateMut.isPending}>
              Kirim Balasan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
