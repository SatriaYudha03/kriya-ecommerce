"use client";

import { Tags } from "lucide-react";
import { useAdminTags } from "@/lib/catalog/queries";
import { useLanguage } from "@/components/kriya/language-provider";
import {
  Banner,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Page,
  PageHeader,
  SkeletonRows,
  Td,
  Th,
  Tr,
} from "@/components/kriya/admin/ui";

export default function TagsPage() {
  const { t } = useLanguage();
  const { data, isLoading, isError, refetch } = useAdminTags();
  const tags = data ?? [];

  return (
    <Page>
      <PageHeader icon={Tags} title={t("nav.admin.tags")} subtitle={t("admin.tags.count", { total: tags.length })} />

      <Banner tone="info" className="mb-4">
        {t("adminCatalog.tags.emptyHint")}
      </Banner>

      <Card flush>
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !isLoading && tags.length === 0 ? (
          <EmptyState icon={Tags} title={t("adminCatalog.tags.empty")} />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>{t("admin.tags.thName")} (ID)</Th>
                <Th>{t("admin.tags.thName")} (EN)</Th>
                <Th>Slug</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows cols={3} />
              ) : (
                tags.map((tag) => (
                  <Tr key={tag.id}>
                    <Td className="font-semibold">{tag.name_i18n?.id || "—"}</Td>
                    <Td>{tag.name_i18n?.en || "—"}</Td>
                    <Td className="font-mono text-xs text-admin-muted">{tag.slug}</Td>
                  </Tr>
                ))
              )}
            </tbody>
          </DataTable>
        )}
      </Card>
    </Page>
  );
}
