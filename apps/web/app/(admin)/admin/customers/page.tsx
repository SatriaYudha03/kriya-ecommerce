"use client";

import { useState } from "react";
import { User, Users } from "lucide-react";
import { useAdminCustomers } from "@/lib/customer/queries";
import { formatRupiah } from "@/lib/format";
import { useLanguage } from "@/components/kriya/language-provider";
import {
  Card,
  DataTable,
  EmptyState,
  IndexToolbar,
  Page,
  PageHeader,
  Pager,
  SearchInput,
  SelectInput,
  SkeletonRows,
  Td,
  Th,
  Tr,
  useAdminFormat,
  useDebounced,
} from "@/components/kriya/admin/ui";

const LIMIT = 20;

export default function CustomersPage() {
  const { t } = useLanguage();
  const fmt = useAdminFormat();
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q, 400);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminCustomers(debouncedQ, sort, page, LIMIT);

  const customers = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <Page width="wide">
      <PageHeader icon={User} title={t("nav.admin.customers")} subtitle={t("admin.customers.count", { total })} />

      <Card flush>
        <IndexToolbar className="px-3">
          <SearchInput
            className="sm:max-w-sm"
            placeholder={t("adminCustomer.customers.search")}
            aria-label={t("adminCustomer.customers.search")}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          <SelectInput
            className="sm:ml-auto sm:w-56 [&_select]:h-8"
            value={sort}
            aria-label={t("admin.customers.sort")}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="newest">{t("adminCustomer.customers.sortNewest")}</option>
            <option value="total_spent">{t("adminCustomer.customers.sortTotalSpent")}</option>
          </SelectInput>
        </IndexToolbar>

        {!isLoading && customers.length === 0 ? (
          <EmptyState icon={Users} title={t("adminCustomer.customers.noData")} />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>{t("admin.customers.thCustomer")}</Th>
                <Th>{t("adminCustomer.customers.colPhone")}</Th>
                <Th align="right">{t("adminCustomer.customers.colOrders")}</Th>
                <Th align="right">{t("adminCustomer.customers.colSpent")}</Th>
                <Th align="right">{t("adminCustomer.customers.colRegistered")}</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows cols={5} />
              ) : (
                customers.map((c) => (
                  <Tr key={c.id} href={`/admin/customers/${c.id}`}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e3e3e3] text-xs font-semibold text-admin-muted">
                          {(c.full_name || c.email).slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{c.full_name || "—"}</p>
                          <p className="truncate text-xs text-admin-muted">{c.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap text-admin-muted">{c.phone || "—"}</Td>
                    <Td align="right" className="tabular-nums">
                      {t("admin.customers.ordersN", { n: c.orders_count })}
                    </Td>
                    <Td align="right" className="whitespace-nowrap tabular-nums">
                      {formatRupiah(c.total_spent)}
                    </Td>
                    <Td align="right" className="whitespace-nowrap text-admin-muted">
                      {fmt.date(c.created_at)}
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </DataTable>
        )}
        <Pager page={page} totalPages={totalPages} onPage={setPage} />
      </Card>
    </Page>
  );
}
