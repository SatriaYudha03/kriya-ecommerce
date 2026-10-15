"use client";

import { useMemo, useState } from "react";
import { CornerDownRight, ListTree, Pencil, Plus, Trash2 } from "lucide-react";
import { useAdminCategories, useDeleteCategory } from "@/lib/catalog/queries";
import type { AdminCategory } from "@/lib/catalog/types";
import { CategoryForm } from "@/components/kriya/catalog/category-form";
import { useLanguage } from "@/components/kriya/language-provider";
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  DataTable,
  EmptyState,
  ErrorState,
  Page,
  PageHeader,
  SkeletonRows,
  Td,
  Th,
  Tr,
  stopRow,
} from "@/components/kriya/admin/ui";

// Urutkan pohon: induk menurut posisi, anak langsung di bawah induknya.
function toTree(list: AdminCategory[]): { cat: AdminCategory; depth: number }[] {
  const byParent = new Map<string, AdminCategory[]>();
  for (const c of list) {
    const key = c.parent_id ?? "";
    byParent.set(key, [...(byParent.get(key) ?? []), c]);
  }
  const ids = new Set(list.map((c) => c.id));
  const out: { cat: AdminCategory; depth: number }[] = [];
  const walk = (parent: string, depth: number) => {
    for (const c of (byParent.get(parent) ?? []).sort((a, b) => a.position - b.position)) {
      out.push({ cat: c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk("", 0);
  // Yatim (induk tidak ada di daftar) tetap tampil.
  for (const c of list) if (c.parent_id && !ids.has(c.parent_id)) out.push({ cat: c, depth: 0 });
  return out;
}

export default function AdminCategoriesPage() {
  const { t } = useLanguage();
  const [form, setForm] = useState<{ open: boolean; categoryId?: string }>({ open: false });
  const [pendingDelete, setPendingDelete] = useState<AdminCategory | null>(null);
  const { data: categories, isLoading, isError, refetch } = useAdminCategories();
  const del = useDeleteCategory();
  const rows = useMemo(() => toTree(categories ?? []), [categories]);

  const addButton = (
    <Button variant="primary" onClick={() => setForm({ open: true })}>
      <Plus /> {t("adminCatalog.categories.add")}
    </Button>
  );

  return (
    <Page width="wide">
      <PageHeader
        icon={ListTree}
        title={t("nav.admin.categories")}
        subtitle={t("adminCatalog.categories.subtitle")}
        actions={addButton}
      />

      <Card flush>
        {isError ? (
          <ErrorState message={t("adminCatalog.categories.error")} onRetry={() => refetch()} />
        ) : !isLoading && rows.length === 0 ? (
          <EmptyState icon={ListTree} title={t("adminCatalog.categories.empty")} action={addButton} />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>{t("adminCatalog.categories.thCategory")}</Th>
                <Th>{t("adminCatalog.categories.thSlug")}</Th>
                <Th align="right">{t("adminCatalog.categories.thPosition")}</Th>
                <Th>{t("adminCatalog.categories.thStatus")}</Th>
                <Th>
                  <span className="sr-only">{t("adminCatalog.categories.thActions")}</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows cols={5} />
              ) : (
                rows.map(({ cat: c, depth }) => (
                  <Tr
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => setForm({ open: true, categoryId: c.id })}
                  >
                    <Td>
                      <div className="flex items-center gap-1.5" style={{ paddingLeft: depth * 20 }}>
                        {depth > 0 && <CornerDownRight className="size-3.5 text-admin-faint" />}
                        <span className={depth === 0 ? "font-semibold" : ""}>{c.name}</span>
                      </div>
                    </Td>
                    <Td className="font-mono text-xs text-admin-muted">{c.slug}</Td>
                    <Td align="right" className="tabular-nums text-admin-muted">
                      {c.position}
                    </Td>
                    <Td>
                      {c.is_active ? (
                        <Badge tone="success">{t("adminCatalog.categories.active")}</Badge>
                      ) : (
                        <Badge>{t("adminCatalog.categories.inactive")}</Badge>
                      )}
                    </Td>
                    <Td align="right" className="w-24 whitespace-nowrap" onClick={stopRow}>
                      <Button
                        variant="tertiary"
                        size="icon-slim"
                        aria-label={t("adminCatalog.categories.edit")}
                        title={t("adminCatalog.categories.edit")}
                        onClick={() => setForm({ open: true, categoryId: c.id })}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="tertiary"
                        size="icon-slim"
                        aria-label={t("adminCatalog.categories.delete")}
                        title={t("adminCatalog.categories.delete")}
                        onClick={() => setPendingDelete(c)}
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
      </Card>

      {form.open && <CategoryForm categoryId={form.categoryId} onClose={() => setForm({ open: false })} />}

      <ConfirmModal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title={t("admin.categories.deleteTitle")}
        message={pendingDelete ? t("adminCatalog.categories.deleteConfirm", { name: pendingDelete.name }) : ""}
        confirmLabel={t("adminCatalog.categories.delete")}
        loading={del.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;
          del.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
        }}
      />
    </Page>
  );
}
