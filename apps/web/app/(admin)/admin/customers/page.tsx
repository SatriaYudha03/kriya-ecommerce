"use client";

import { useState, useEffect } from "react";
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
          <SelectTrigger className="w-[200px]">
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
              <TableHead>Email</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>No. HP</TableHead>
              <TableHead className="text-right">Total Pesanan</TableHead>
              <TableHead className="text-right">Total Belanja</TableHead>
              <TableHead className="text-right">Tgl Daftar</TableHead>
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
                  className="cursor-pointer hover:bg-muted/50" 
                  onClick={() => window.location.href = `/admin/customers/${c.id}`}
                >
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.full_name || "-"}</TableCell>
                  <TableCell>{c.phone || "-"}</TableCell>
                  <TableCell className="text-right">{c.orders_count}</TableCell>
                  <TableCell className="text-right">{formatRupiah(c.total_spent)}</TableCell>
                  <TableCell className="text-right">{new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(c.created_at))}</TableCell>
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
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
