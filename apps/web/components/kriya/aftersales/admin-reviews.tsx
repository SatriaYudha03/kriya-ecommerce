"use client";

import { useState } from "react";
import { MessageSquare, Reply } from "lucide-react";
import { useAdminReviews, useAdminUpdateReview } from "@/lib/aftersales/queries";
import { RatingStars } from "@/components/kriya/catalog/rating-stars";
import { useLanguage } from "@/components/kriya/language-provider";
import { ReviewStatusBadge } from "@/components/kriya/admin/status-badges";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  FilterTabs,
  IndexToolbar,
  Modal,
  Pager,
  SkeletonRows,
  Td,
  TextArea,
  Th,
  Tr,
  useAdminFormat,
} from "@/components/kriya/admin/ui";
import type { Review, ReviewStatus } from "@/lib/aftersales/types";

const LIMIT = 20;

export function AdminReviews() {
  const { t } = useLanguage();
  const fmt = useAdminFormat();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ReviewStatus>("pending");
  const { data: reviews, isLoading } = useAdminReviews(status, page, LIMIT);
  const [replying, setReplying] = useState<Review | null>(null);
  const updateMut = useAdminUpdateReview();

  const setReviewStatus = (id: string, next: ReviewStatus) => updateMut.mutate({ id, req: { status: next } });
  const rows = reviews?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((reviews?.meta.total ?? 0) / LIMIT));
  const busy = (id: string) => updateMut.isPending && updateMut.variables?.id === id;

  return (
    <Card flush>
      <IndexToolbar>
        <FilterTabs
          tabs={[
            { value: "pending", label: t("after.admin.reviews.filterPending") },
            { value: "approved", label: t("after.admin.reviews.filterApproved") },
            { value: "rejected", label: t("after.admin.reviews.filterRejected") },
          ]}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
      </IndexToolbar>

      {!isLoading && rows.length === 0 ? (
        <EmptyState icon={MessageSquare} title={t("after.admin.reviews.emptyState")} />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>{t("after.admin.reviews.thReview")}</Th>
              <Th>{t("after.admin.reviews.thUser")}</Th>
              <Th>{t("after.admin.reviews.thStatus")}</Th>
              <Th>
                <span className="sr-only">{t("after.admin.reviews.thAction")}</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows cols={4} />
            ) : (
              rows.map((review) => (
                <Tr key={review.id}>
                  <Td className="max-w-[26rem] align-top">
                    <p className="truncate text-xs font-medium text-admin-muted" title={review.product_name}>
                      {review.product_name}
                    </p>
                    <div className="mt-1">
                      <RatingStars value={review.rating} size="sm" />
                    </div>
                    {review.title && <p className="mt-1.5 font-semibold">{review.title}</p>}
                    {review.body && <p className="mt-0.5 line-clamp-3 whitespace-normal text-admin-text">{review.body}</p>}
                    {review.admin_reply && (
                      <div className="mt-2 rounded-lg border-l-2 border-[#b5b5b5] bg-admin-subdued px-2.5 py-1.5 text-xs">
                        <span className="font-semibold">{t("admin.reviews.yourReply")}</span>{" "}
                        <span className="line-clamp-2 text-admin-muted">{review.admin_reply}</span>
                      </div>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap align-top">
                    <p>{review.user_name}</p>
                    <p className="mt-0.5 text-xs text-admin-muted">{fmt.date(review.created_at)}</p>
                  </Td>
                  <Td className="align-top">
                    <ReviewStatusBadge status={review.status} />
                  </Td>
                  <Td align="right" className="whitespace-nowrap align-top">
                    <div className="inline-flex flex-wrap justify-end gap-1.5">
                      {review.status === "pending" ? (
                        <>
                          <Button size="slim" disabled={busy(review.id)} onClick={() => setReviewStatus(review.id, "rejected")}>
                            {t("after.admin.reviews.reject")}
                          </Button>
                          <Button
                            size="slim"
                            variant="primary"
                            disabled={busy(review.id)}
                            onClick={() => setReviewStatus(review.id, "approved")}
                          >
                            {t("after.admin.reviews.approve")}
                          </Button>
                        </>
                      ) : (
                        <Button size="slim" variant="tertiary" disabled={busy(review.id)} onClick={() => setReviewStatus(review.id, "pending")}>
                          {t("after.admin.reviews.reset")}
                        </Button>
                      )}
                      <Button size="slim" onClick={() => setReplying(review)}>
                        <Reply /> {t("after.admin.reviews.reply")}
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </DataTable>
      )}
      <Pager page={page} totalPages={totalPages} onPage={setPage} />

      {replying && <AdminReplyModal key={replying.id} review={replying} onClose={() => setReplying(null)} />}
    </Card>
  );
}

// Di-mount ulang per ulasan (key) sehingga isian awal = balasan tersimpan.
function AdminReplyModal({ review, onClose }: { review: Review; onClose: () => void }) {
  const { t } = useLanguage();
  const [reply, setReply] = useState(review.admin_reply || "");
  const updateMut = useAdminUpdateReview();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMut.mutate({ id: review.id, req: { admin_reply: reply } }, { onSuccess: onClose });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("after.admin.reviews.replyTitle")}
      footer={
        <>
          <Button onClick={onClose}>{t("after.admin.reviews.replyCancel")}</Button>
          <Button type="submit" form="review-reply" variant="primary" loading={updateMut.isPending}>
            {t("after.admin.reviews.replySubmit")}
          </Button>
        </>
      }
    >
      <div className="mb-4 rounded-xl bg-admin-subdued p-3">
        <RatingStars value={review.rating} size="sm" />
        {review.title && <p className="mt-1.5 font-semibold">{review.title}</p>}
        {review.body && <p className="mt-0.5 text-admin-text">{review.body}</p>}
        <p className="mt-1.5 text-xs text-admin-muted">
          {review.user_name} · {review.product_name}
        </p>
      </div>
      <form id="review-reply" onSubmit={handleSubmit}>
        <Field label={t("after.admin.reviews.replyLabel")} htmlFor="review-reply-body">
          <TextArea
            id="review-reply-body"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={t("after.admin.reviews.replyPlaceholder")}
            rows={4}
            maxLength={2000}
          />
        </Field>
      </form>
    </Modal>
  );
}
