"use client";

import { useMemo, useState } from "react";
import { Package, Plus, Tag, Trash2 } from "lucide-react";
import { useCategories, useAdminProducts, useDeleteProduct } from "@/lib/catalog/queries";
import { formatRupiah } from "@/lib/format";
import { useLanguage } from "@/components/kriya/language-provider";
import { ProductStatusBadge } from "@/components/kriya/admin/status-badges";
import {
  Button,
  ButtonLink,
  Card,
  ConfirmModal,
  DataTable,
  EmptyState,
  ErrorState,
  FilterTabs,
  IndexToolbar,
  Page,
  PageHeader,
  Pager,
  SearchInput,
  SkeletonRows,
  Td,
  Th,
  Thumbnail,
  Tr,
  stopRow,
  useDebounced,
} from "@/components/kriya/admin/ui";

const LIMIT = 20;
type StatusTab = "all" | "published" | "draft" | "archived";

export default function AdminProductsPage() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusTab>("all");
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const { data, isLoading, isError, refetch } = useAdminProducts({
    page,
    limit: LIMIT,
    status: status === "all" ? "" : status,
    q: debouncedQ,
  });
  const { data: categories } = useCategories();
  const del = useDeleteProduct();

  const catName = useMemo(() => {
    const m = new Map<string, string>();
    categories?.forEach((c) => m.set(c.slug, c.name));
    return m;
  }, [categories]);

  const products = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const tabs: { value: StatusTab; label: string }[] = [
    { value: "all", label: t("admin.common.all") },
    { value: "published", label: t("adminCatalog.products.published") },
    { value: "draft", label: t("adminCatalog.products.draft") },
    { value: "archived", label: t("adminCatalog.products.archived") },
  ];

  return (
    <Page width="wide">
      <PageHeader
        icon={Tag}
        title={t("nav.admin.products")}
        subtitle={t("adminCatalog.products.count", { total })}
        actions={
          <ButtonLink href="/admin/products/new" variant="primary">
            <Plus /> {t("adminCatalog.products.add")}
          </ButtonLink>
        }
      />

      <Card flush>
        <IndexToolbar>
          <FilterTabs
            tabs={tabs}
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          />
          <SearchInput
            className="sm:ml-auto sm:w-64"
            placeholder={t("adminCatalog.products.search")}
            aria-label={t("adminCatalog.products.search")}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </IndexToolbar>

        {isError ? (
          <ErrorState message={t("adminCatalog.products.error")} onRetry={() => refetch()} />
        ) : !isLoading && products.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t("adminCatalog.products.empty")}
            description={t("admin.products.emptyHint")}
            action={
              <ButtonLink href="/admin/products/new" variant="primary">
                <Plus /> {t("adminCatalog.products.add")}
              </ButtonLink>
            }
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>{t("adminCatalog.products.thProduct")}</Th>
                <Th>{t("adminCatalog.products.thStatus")}</Th>
                <Th>{t("adminCatalog.products.thCategory")}</Th>
                <Th align="right">{t("adminCatalog.products.thPrice")}</Th>
                <Th>
                  <span className="sr-only">{t("adminCatalog.products.thActions")}</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows cols={5} />
              ) : (
                products.map((p) => (
                  <Tr key={p.id} href={`/admin/products/${p.id}`}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Thumbnail src={p.thumbnail_url} alt={p.name} />
                        <span className="font-semibold">{p.name}</span>
                      </div>
                    </Td>
                    <Td>
                      <ProductStatusBadge status={p.status} />
                    </Td>
                    <Td className="text-admin-muted">{catName.get(p.category_slug) ?? p.category_slug}</Td>
                    <Td align="right" className="tabular-nums">
                      {formatRupiah(p.price_min)}
                    </Td>
                    <Td align="right" className="w-12" onClick={stopRow}>
                      <Button
                        variant="tertiary"
                        size="icon-slim"
                        aria-label={t("adminCatalog.products.delete")}
                        title={t("adminCatalog.products.delete")}
                        onClick={() => setPendingDelete({ id: p.id, name: p.name })}
                      >
                        <Trash2 />
                      </Button>
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </DataTable>
        )}
        <Pager page={page} totalPages={totalPages} onPage={setPage} />
      </Card>

      <ConfirmModal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title={t("admin.products.deleteTitle")}
        message={pendingDelete ? t("adminCatalog.products.deleteConfirm", { name: pendingDelete.name }) : ""}
        confirmLabel={t("adminCatalog.products.delete")}
        loading={del.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;
          del.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
        }}
      />
    </Page>
  );
}
