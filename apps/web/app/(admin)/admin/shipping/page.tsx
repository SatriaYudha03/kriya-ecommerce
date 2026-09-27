"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/format";
import { useLanguage } from "@/components/kriya/language-provider";
import { useAdminShippingZones, useUpdateShippingMethod } from "@/lib/customer/queries";
import type { ShippingMethod } from "@/lib/customer/types";
import { SectionHeading } from "@/components/kriya/section-heading";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Loader2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AdminShippingPage() {
  const { t, locale } = useLanguage();
  const { data: zones, isLoading, isError, refetch } = useAdminShippingZones();
  const { mutate: updateMethod, isPending: formSaveLoading } = useUpdateShippingMethod();

  const [editMethod, setEditMethod] = useState<ShippingMethod | null>(null);
  const [formBaseCost, setFormBaseCost] = useState(0);
  const [formPerKgCost, setFormPerKgCost] = useState(0);
  const [formFreeMin, setFormFreeMin] = useState<number | "">("");

  const handleEdit = (m: ShippingMethod) => {
    setEditMethod(m);
    setFormBaseCost(m.base_cost);
    setFormPerKgCost(m.per_kg_cost);
    setFormFreeMin(m.free_shipping_min_subtotal ?? "");
  };

  const saveEdit = () => {
    if (!editMethod) return;
    updateMethod(
      {
        id: editMethod.id,
        payload: {
          base_cost: formBaseCost,
          per_kg_cost: formPerKgCost,
          free_shipping_min_subtotal: formFreeMin === "" ? -1 : Number(formFreeMin),
        },
      },
      {
        onSuccess: () => {
          toast.success(t("adminCustomer.shipping.saved"));
          setEditMethod(null);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Gagal menyimpan biaya pengiriman");
        },
      }
    );
  };

  return (
    <div className="space-y-6 p-6">
      <SectionHeading 
        title={t("adminCustomer.shipping.title")} 
        subtitle={t("adminCustomer.shipping.subtitle")} 
      />
      
      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground" role="status">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>{t("adminCustomer.shipping.loading")}</span>
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
          <AlertCircle className="mx-auto h-8 w-8 mb-2 text-red-500" />
          <p className="text-sm font-medium">{t("adminCustomer.shipping.error")}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
            Coba lagi
          </Button>
        </div>
      ) : (
        zones?.map((zone) => {
          const zoneName = zone.name_i18n[locale] || zone.name_i18n.id || zone.name_i18n.en || zone.code;
          return (
            <div key={zone.id} className="border rounded-lg bg-card text-card-foreground shadow-sm">
              <div className="p-6">
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-semibold leading-none tracking-tight">
                    {zoneName}
                  </h2>
                  {!zone.is_active && (
                    <Badge variant="secondary">{t("adminCustomer.shipping.inactive")}</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-2 mb-4">
                  {zone.provinces.map((prov) => (
                    <Badge key={prov} variant="outline" className="text-xs">
                      {prov}
                    </Badge>
                  ))}
                </div>
                <div className="overflow-x-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("adminCustomer.shipping.methodCol")}</TableHead>
                        <TableHead>{t("adminCustomer.shipping.rateTypeCol")}</TableHead>
                        <TableHead>{t("adminCustomer.shipping.baseCostCol")}</TableHead>
                        <TableHead>{t("adminCustomer.shipping.perKgCol")}</TableHead>
                        <TableHead>{t("adminCustomer.shipping.freeMinCol")}</TableHead>
                        <TableHead className="w-[80px]">{t("adminCustomer.shipping.actionCol")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {zone.methods.map((m) => {
                        const methodName = m.name_i18n[locale] || m.name_i18n.id || m.name_i18n.en || m.code;
                        return (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">
                              {methodName}
                              <div className="text-xs text-muted-foreground mt-1">
                                {t("customer.shippingPicker.estimate", { min: m.eta_min_days, max: m.eta_max_days })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {m.rate_type === "flat" ? t("adminCustomer.shipping.flat") : t("adminCustomer.shipping.perKg")}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatRupiah(m.base_cost)}</TableCell>
                            <TableCell>
                              {m.rate_type === "per_kg" ? formatRupiah(m.per_kg_cost) : "-"}
                            </TableCell>
                            <TableCell>
                              {m.free_shipping_min_subtotal ? (
                                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                  {t("adminCustomer.shipping.minSpend", { amount: formatRupiah(m.free_shipping_min_subtotal) })}
                                </span>
                              ) : "-"}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleEdit(m)}
                                aria-label={`Edit ${methodName}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          );
        })
      )}

      <Dialog open={!!editMethod} onOpenChange={(open) => !open && setEditMethod(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("adminCustomer.shipping.editTitle")}</DialogTitle>
            <DialogDescription>{t("adminCustomer.shipping.editDesc")}</DialogDescription>
          </DialogHeader>
          {editMethod && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="shipping_form_base_cost">{t("adminCustomer.shipping.baseCostLabel")}</Label>
                <Input 
                  id="shipping_form_base_cost"
                  type="number" 
                  value={formBaseCost} 
                  onChange={(e) => setFormBaseCost(Number(e.target.value))} 
                />
              </div>
              {editMethod.rate_type === "per_kg" && (
                <div className="space-y-2">
                  <Label htmlFor="shipping_form_per_kg_cost">{t("adminCustomer.shipping.perKgLabel")}</Label>
                  <Input 
                    id="shipping_form_per_kg_cost"
                    type="number" 
                    value={formPerKgCost} 
                    onChange={(e) => setFormPerKgCost(Number(e.target.value))} 
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="shipping_form_free_min">{t("adminCustomer.shipping.freeMinLabel")}</Label>
                <Input 
                  id="shipping_form_free_min"
                  type="number" 
                  placeholder={t("adminCustomer.shipping.freeMinPlaceholder")}
                  value={formFreeMin} 
                  onChange={(e) => setFormFreeMin(e.target.value ? Number(e.target.value) : "")} 
                />
              </div>
              <Button onClick={saveEdit} disabled={formSaveLoading} className="w-full">
                {formSaveLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("adminCustomer.shipping.saving")}
                  </>
                ) : (
                  t("adminCustomer.shipping.save")
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
