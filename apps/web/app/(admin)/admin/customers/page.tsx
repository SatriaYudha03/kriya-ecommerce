"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminCustomers } from "@/lib/customer/queries";
import { useLanguage } from "@/components/kriya/language-provider";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRupiah } from "@/lib/format";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export default function CustomersPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 500);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useAdminCustomers(debouncedQ, sort, page, limit);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{t("adminCustomer.customers.title")}</h1>
      </div>

      <div className="flex gap-4 mb-6">
        <Input 
          placeholder={t("adminCustomer.customers.search")}
          aria-label={t("adminCustomer.customers.search")}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
        <Select 
          value={sort} 
          onValueChange={(val) => {
            setSort(val || "newest");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]" aria-label="Urutkan daftar pelanggan">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("adminCustomer.customers.sortNewest")}</SelectItem>
            <SelectItem value="total_spent">{t("adminCustomer.customers.sortTotalSpent")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("adminCustomer.customers.colEmail")}</TableHead>
              <TableHead>{t("adminCustomer.customers.colName")}</TableHead>
              <TableHead>{t("adminCustomer.customers.colPhone")}</TableHead>
              <TableHead className="text-right">{t("adminCustomer.customers.colOrders")}</TableHead>
              <TableHead className="text-right">{t("adminCustomer.customers.colSpent")}</TableHead>
              <TableHead className="text-right">{t("adminCustomer.customers.colRegistered")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {t("adminCustomer.customers.noData")}
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((c) => (
                <TableRow 
                  key={c.id} 
                  tabIndex={0}
                  className="cursor-pointer hover:bg-muted/50 focus:outline-none focus:bg-muted/50" 
                  onClick={() => router.push(`/admin/customers/${c.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/admin/customers/${c.id}`);
                    }
                  }}
                  role="link"
                  aria-label={`${c.full_name || c.email} detail`}
                >
                  <TableCell className="font-medium text-foreground">{c.email}</TableCell>
                  <TableCell>{c.full_name || "-"}</TableCell>
                  <TableCell>{c.phone || "-"}</TableCell>
                  <TableCell className="text-right">{c.orders_count}</TableCell>
                  <TableCell className="text-right font-medium">{formatRupiah(c.total_spent)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(c.created_at))}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.total > limit && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            aria-label={t("adminCustomer.customers.prevPage")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm">
            {page} / {Math.ceil(data.meta.total / limit)}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(data.meta.total / limit)}
            aria-label={t("adminCustomer.customers.nextPage")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
