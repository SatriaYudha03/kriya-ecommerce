"use client";

import { useState } from "react";
import { Undo2 } from "lucide-react";
import { useAdminReturns, useUpdateAdminReturnStatus } from "@/lib/aftersales/queries";
import type { ReturnReasonCode, ReturnRequest, ReturnStatus } from "@/lib/aftersales/types";
import type { MessageKey } from "@/lib/i18n";
import { useLanguage } from "@/components/kriya/language-provider";
import { ReturnStatusBadge } from "@/components/kriya/admin/status-badges";
import {
  Button,
  ButtonLink,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  FilterTabs,
  IndexToolbar,
  InfoItem,
  InfoList,
  Modal,
  Page,
  PageHeader,
  Pager,
  SkeletonRows,
  Td,
  TextArea,
  TextLink,
  Th,
  Thumbnail,
  Tr,
  stopRow,
  useAdminFormat,
} from "@/components/kriya/admin/ui";

const LIMIT = 20;
type Tab = ReturnStatus | "all";

const REASON: Record<ReturnReasonCode, MessageKey> = {
  damaged: "after.returns.reasonDamaged",
  wrong_item: "after.returns.reasonWrongItem",
  not_as_described: "after.returns.reasonNotAsDescribed",
  missing_parts: "after.returns.reasonMissingParts",
  changed_mind: "after.returns.reasonChangedMind",
  other: "after.returns.reasonOther",
};

function ReturnModal({ req, onClose }: { req: ReturnRequest; onClose: () => void }) {
  const { t } = useLanguage();
  const fmt = useAdminFormat();
  const updateStatus = useUpdateAdminReturnStatus();
  const [note, setNote] = useState(req.admin_note ?? "");
  const actionable = req.status === "requested" || req.status === "approved";

  const set = (status: ReturnStatus) =>
    updateStatus.mutate({ id: req.id, req: { status, admin_note: note || undefined } }, { onSuccess: onClose });

  const footer =
    req.status === "requested" ? (
      <>
        <Button variant="critical" loading={updateStatus.isPending && updateStatus.variables?.req.status === "rejected"} onClick={() => set("rejected")}>
          {t("admin.returns.reject")}
        </Button>
        <Button variant="primary" loading={updateStatus.isPending && updateStatus.variables?.req.status === "approved"} onClick={() => set("approved")}>
          {t("admin.returns.approve")}
        </Button>
      </>
    ) : req.status === "approved" ? (
      <Button variant="primary" loading={updateStatus.isPending} onClick={() => set("received")}>
        {t("admin.returns.markReceived")}
      </Button>
    ) : req.status === "received" ? (
      <ButtonLink href={`/admin/orders/${req.order_id}`} variant="primary">
        {t("admin.returns.openForRefund")}
      </ButtonLink>
    ) : undefined;

  return (
    <Modal open onClose={onClose} title={t("admin.returns.modalTitle", { order: req.order_number ?? req.order_id.split("-")[0] })} footer={footer}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <ReturnStatusBadge status={req.status} />
          <TextLink href={`/admin/orders/${req.order_id}`}>{t("admin.returns.viewOrder")}</TextLink>
        </div>
        <InfoList className="grid grid-cols-2 gap-3 space-y-0">
          <InfoItem label={t("admin.returns.requestedAt")}>{fmt.dateTime(req.created_at)}</InfoItem>
          <InfoItem label={t("after.returns.reasonLabel")}>{t(REASON[req.reason_code] ?? "after.returns.reasonOther")}</InfoItem>
        </InfoList>
        {req.description && (
          <InfoItem label={t("admin.returns.description")}>
            <span className="whitespace-pre-line">{req.description}</span>
          </InfoItem>
        )}
        <div className="divide-y divide-admin-border rounded-xl border border-admin-border">
          {req.items.map((item) => (
            <div key={item.order_item_id} className="flex items-center gap-3 p-3">
              <Thumbnail src={item.thumbnail_url} alt={item.product_name} />
              <p className="min-w-0 flex-1 truncate font-medium">{item.product_name}</p>
              <span className="tabular-nums text-admin-muted">× {item.qty}</span>
            </div>
          ))}
        </div>
        {actionable ? (
          <Field label={t("after.returns.adminNoteLabel")} htmlFor="return-note" help={t("admin.returns.noteHint")}>
            <TextArea id="return-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        ) : (
          req.admin_note && <InfoItem label={t("after.returns.adminNoteLabel")}>{req.admin_note}</InfoItem>
        )}
      </div>
    </Modal>
  );
}

export default function AdminReturnsPage() {
  const { t } = useLanguage();
  const fmt = useAdminFormat();
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>("all");
  const [open, setOpen] = useState<ReturnRequest | null>(null);
  const { data, isLoading, isError, refetch } = useAdminReturns(tab === "all" ? undefined : tab, page, LIMIT);

  const rows = data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.meta.total ?? 0) / LIMIT));
  const statuses: ReturnStatus[] = ["requested", "approved", "received", "refunded", "rejected"];

  return (
    <Page width="wide">
      <PageHeader icon={Undo2} title={t("nav.admin.returns")} subtitle={t("admin.returns.subtitle")} />

      <Card flush>
        <IndexToolbar>
          <FilterTabs
            tabs={[
              { value: "all" as Tab, label: t("admin.common.all") },
              ...statuses.map((s) => ({ value: s as Tab, label: t(`admin.returns.status.${s}` as MessageKey) })),
            ]}
            value={tab}
            onChange={(v) => {
              setTab(v);
              setPage(1);
            }}
          />
        </IndexToolbar>

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !isLoading && rows.length === 0 ? (
          <EmptyState icon={Undo2} title={t("after.returns.empty")} />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>{t("admin.orders.thOrder")}</Th>
                <Th>{t("admin.returns.requestedAt")}</Th>
                <Th>{t("after.returns.reasonLabel")}</Th>
                <Th>{t("admin.returns.items")}</Th>
                <Th>{t("after.admin.orders.thStatus")}</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows cols={5} />
              ) : (
                rows.map((req) => (
                  <Tr key={req.id} className="cursor-pointer" onClick={() => setOpen(req)}>
                    <Td className="whitespace-nowrap font-semibold">
                      <TextLink href={`/admin/orders/${req.order_id}`} onClick={stopRow} className="text-admin-text">
                        {req.order_number ?? req.order_id.split("-")[0]}
                      </TextLink>
                    </Td>
                    <Td className="whitespace-nowrap text-admin-muted">{fmt.date(req.created_at)}</Td>
                    <Td>{t(REASON[req.reason_code] ?? "after.returns.reasonOther")}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {req.items.slice(0, 3).map((it) => (
                            <Thumbnail key={it.order_item_id} src={it.thumbnail_url} alt={it.product_name} size="sm" />
                          ))}
                        </div>
                        <span className="text-admin-muted">
                          {t("admin.orders.itemsCount", { n: req.items.reduce((s, it) => s + it.qty, 0) })}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <ReturnStatusBadge status={req.status} />
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </DataTable>
        )}
        <Pager page={page} totalPages={totalPages} onPage={setPage} />
      </Card>

      {open && <ReturnModal key={open.id} req={open} onClose={() => setOpen(null)} />}
    </Page>
  );
}
