"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Archive, History } from "lucide-react";
import { useInventory, useMovements, useAdjustment } from "@/lib/catalog/queries";
import type { InventoryItem, StockMovement } from "@/lib/catalog/types";
import { useLanguage } from "@/components/kriya/language-provider";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  FilterTabs,
  IndexToolbar,
  LoadingState,
  Modal,
  Page,
  PageHeader,
  Pager,
  SearchInput,
  SkeletonRows,
  Td,
  TextInput,
  Th,
  Tr,
  useAdminFormat,
  useDebounced,
} from "@/components/kriya/admin/ui";
import { cn } from "@/lib/utils";

const LIMIT = 20;

function MovementHistory({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const { t } = useLanguage();
  const fmt = useAdminFormat();
  const { data, isLoading } = useMovements(item.variant_id, 1, 20);
  const rows = data?.data ?? [];

  return (
    <Modal open onClose={onClose} size="lg" title={t("adminCatalog.inventory.historyTitle", { sku: item.sku })}>
      {isLoading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState icon={History} title={t("adminCatalog.inventory.noHistory")} />
      ) : (
        <div className="-m-4">
          <DataTable>
            <thead>
              <tr>
                <Th>{t("adminCatalog.inventory.thTime")}</Th>
                <Th>{t("adminCatalog.inventory.thReason")}</Th>
                <Th align="right">{t("adminCatalog.inventory.thDelta")}</Th>
                <Th align="right">{t("adminCatalog.inventory.thStockAfter")}</Th>
                <Th>{t("adminCatalog.inventory.thNote")}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m: StockMovement) => (
                <Tr key={m.id}>
                  <Td className="whitespace-nowrap text-admin-muted">{fmt.dateTime(m.created_at)}</Td>
                  <Td className="whitespace-nowrap">{t(`admin.inventory.reason.${m.reason}` as const)}</Td>
                  <Td
                    align="right"
                    className={cn("font-semibold tabular-nums", m.delta > 0 ? "text-[#0c5132]" : "text-admin-critical")}
                  >
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {m.stock_after}
                  </Td>
                  <Td className="text-admin-muted">{m.note || "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      )}
    </Modal>
  );
}

function AdjustmentModal({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const { t } = useLanguage();
  const [qty, setQty] = useState(item.stock.toString());
  const [note, setNote] = useState("");
  const adjust = useAdjustment();
  const parsed = parseInt(qty, 10);
  const valid = !isNaN(parsed) && parsed >= 0;
  const delta = valid ? parsed - item.stock : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    adjust.mutate(
      { variant_id: item.variant_id, qty: parsed, note },
      {
        onSuccess: () => {
          toast.success(t("adminCatalog.inventory.stockUpdated"));
          onClose();
        },
        onError: (err: Error) => toast.error(err.message || t("adminCatalog.inventory.stockFailed")),
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t("adminCatalog.inventory.adjustTitle")}
      footer={
        <>
          <Button onClick={onClose}>{t("adminCatalog.inventory.cancel")}</Button>
          <Button type="submit" form="adjust-form" variant="primary" loading={adjust.isPending} disabled={!valid || delta === 0}>
            {t("adminCatalog.inventory.save")}
          </Button>
        </>
      }
    >
      <form id="adjust-form" onSubmit={submit} className="space-y-4">
        <div className="rounded-xl bg-admin-subdued p-3">
          <p className="font-semibold">{item.product_name}</p>
          <p className="text-xs text-admin-muted">
            {[item.color, item.size].filter(Boolean).join(" / ")} · SKU {item.sku}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("adminCatalog.inventory.currentStock")}>
            <TextInput value={item.stock} disabled readOnly />
          </Field>
          <Field
            label={t("adminCatalog.inventory.newStock")}
            htmlFor="adj-qty"
            help={delta !== 0 ? t("admin.inventory.delta", { delta: delta > 0 ? `+${delta}` : String(delta) }) : undefined}
          >
            <TextInput id="adj-qty" type="number" min="0" required value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
        </div>
        <Field label={t("adminCatalog.inventory.noteLabel")} htmlFor="adj-note">
          <TextInput
            id="adj-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("adminCatalog.inventory.notePlaceholder")}
          />
        </Field>
      </form>
    </Modal>
  );
}

export default function AdminInventoryPage() {
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q);
  const [tab, setTab] = useState<"all" | "low">("all");
  const [page, setPage] = useState(1);
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);
  const [history, setHistory] = useState<InventoryItem | null>(null);
  const { data, isLoading, isError, refetch } = useInventory({
    q: debouncedQ,
    low_stock: tab === "low",
    page,
    limit: LIMIT,
  });

  const items = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <Page width="wide">
      <PageHeader icon={Archive} title={t("adminCatalog.inventory.title")} subtitle={t("admin.inventory.subtitle")} />

      <Card flush>
        <IndexToolbar>
          <FilterTabs
            tabs={[
              { value: "all", label: t("admin.common.all") },
              { value: "low", label: t("adminCatalog.inventory.lowStockOnly") },
            ]}
            value={tab}
            onChange={(v) => {
              setTab(v);
              setPage(1);
            }}
          />
          <SearchInput
            className="sm:ml-auto sm:w-64"
            placeholder={t("adminCatalog.inventory.search")}
            aria-label={t("adminCatalog.inventory.search")}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </IndexToolbar>

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !isLoading && items.length === 0 ? (
          <EmptyState icon={Archive} title={t("adminCatalog.inventory.noItems")} />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>{t("adminCatalog.inventory.thProduct")}</Th>
                <Th>{t("adminCatalog.inventory.thSku")}</Th>
                <Th align="right">{t("admin.inventory.available")}</Th>
                <Th>
                  <span className="sr-only">{t("adminCatalog.inventory.thActions")}</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows cols={4} />
              ) : (
                items.map((item) => (
                  <Tr key={item.variant_id}>
                    <Td>
                      <p className="font-semibold">{item.product_name}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.color && <Badge>{item.color}</Badge>}
                        {item.size && <Badge>{item.size}</Badge>}
                      </div>
                    </Td>
                    <Td className="font-mono text-xs text-admin-muted">{item.sku}</Td>
                    <Td align="right">
                      <div className="inline-flex items-center gap-2">
                        {item.low_stock && <Badge tone="critical">{t("adminCatalog.inventory.low")}</Badge>}
                        <span className="min-w-8 font-semibold tabular-nums">{item.stock}</span>
                      </div>
                    </Td>
                    <Td align="right" className="w-56 whitespace-nowrap">
                      <div className="inline-flex gap-1.5">
                        <Button size="slim" variant="tertiary" onClick={() => setHistory(item)}>
                          <History /> {t("adminCatalog.inventory.history")}
                        </Button>
                        <Button size="slim" onClick={() => setAdjusting(item)}>
                          {t("adminCatalog.inventory.adjust")}
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
      </Card>

      {adjusting && <AdjustmentModal key={adjusting.variant_id} item={adjusting} onClose={() => setAdjusting(null)} />}
      {history && <MovementHistory item={history} onClose={() => setHistory(null)} />}
    </Page>
  );
}
