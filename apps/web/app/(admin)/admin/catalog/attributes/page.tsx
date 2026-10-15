"use client";

import { SlidersHorizontal } from "lucide-react";
import { useAdminAttributes } from "@/lib/catalog/queries";
import { useLanguage } from "@/components/kriya/language-provider";
import {
  Badge,
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

export default function AttributesPage() {
  const { t, locale } = useLanguage();
  const { data, isLoading, isError, refetch } = useAdminAttributes();
  const attributes = [...(data ?? [])].sort((a, b) => a.position - b.position);
  const label = (i18n: Record<string, string> | undefined, fallback: string) => i18n?.[locale] || i18n?.id || fallback;

  return (
    <Page>
      <PageHeader
        icon={SlidersHorizontal}
        title={t("nav.admin.attributes")}
        subtitle={t("admin.attributes.subtitle")}
      />

      <Banner tone="info" className="mb-4">
        {t("adminCatalog.attributes.emptyHint")}
      </Banner>

      <Card flush>
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !isLoading && attributes.length === 0 ? (
          <EmptyState icon={SlidersHorizontal} title={t("adminCatalog.attributes.empty")} />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>{t("admin.attributes.thAttribute")}</Th>
                <Th>{t("admin.attributes.thValues")}</Th>
                <Th>{t("admin.attributes.thFilter")}</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows cols={3} />
              ) : (
                attributes.map((a) => (
                  <Tr key={a.id}>
                    <Td className="align-top">
                      <p className="font-semibold">{label(a.name_i18n, a.slug)}</p>
                      <p className="font-mono text-xs text-admin-muted">{a.slug}</p>
                    </Td>
                    <Td className="align-top">
                      <div className="flex flex-wrap gap-1">
                        {a.terms.map((term) => (
                          <Badge key={term.id}>{label(term.name_i18n, term.slug)}</Badge>
                        ))}
                      </div>
                    </Td>
                    <Td className="align-top">
                      {a.is_filterable ? (
                        <Badge tone="success">{t("admin.attributes.filterable")}</Badge>
                      ) : (
                        <span className="text-admin-muted">—</span>
                      )}
                    </Td>
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
