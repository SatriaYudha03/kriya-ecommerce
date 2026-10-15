"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Settings, Truck } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { useLanguage } from "@/components/kriya/language-provider";
import { useAdminShippingZones, useUpdateShippingMethod } from "@/lib/customer/queries";
import type { ShippingMethod } from "@/lib/customer/types";
import {
  Badge,
  Button,
  Card,
  CardSection,
  DataTable,
  ErrorState,
  Field,
  LoadingState,
  Modal,
  Page,
  PageHeader,
  Td,
  TextInput,
  Th,
  Tr,
} from "@/components/kriya/admin/ui";

function EditMethodModal({ method, onClose }: { method: ShippingMethod; onClose: () => void }) {
  const { t, locale } = useLanguage();
  const { mutate: updateMethod, isPending } = useUpdateShippingMethod();
  const [baseCost, setBaseCost] = useState(method.base_cost);
  const [perKgCost, setPerKgCost] = useState(method.per_kg_cost);
  const [freeMin, setFreeMin] = useState<number | "">(method.free_shipping_min_subtotal ?? "");
  const name = method.name_i18n[locale] || method.name_i18n.id || method.code;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    updateMethod(
      {
        id: method.id,
        payload: {
          base_cost: baseCost,
          per_kg_cost: perKgCost,
          free_shipping_min_subtotal: freeMin === "" ? -1 : Number(freeMin),
        },
      },
      {
        onSuccess: () => {
          toast.success(t("adminCustomer.shipping.saved"));
          onClose();
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : t("admin.common.saveFailed")),
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={`${t("adminCustomer.shipping.editTitle")} · ${name}`}
      footer={
        <>
          <Button onClick={onClose}>{t("admin.common.cancel")}</Button>
          <Button type="submit" form="shipping-method-form" variant="primary" loading={isPending}>
            {t("adminCustomer.shipping.save")}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-admin-muted">{t("adminCustomer.shipping.editDesc")}</p>
      <form id="shipping-method-form" onSubmit={save} className="space-y-4">
        <Field label={t("adminCustomer.shipping.baseCostLabel")} htmlFor="sm-base">
          <TextInput id="sm-base" type="number" min={0} prefix="Rp" value={baseCost} onChange={(e) => setBaseCost(Number(e.target.value))} />
        </Field>
        {method.rate_type === "per_kg" && (
          <Field label={t("adminCustomer.shipping.perKgLabel")} htmlFor="sm-perkg">
            <TextInput
              id="sm-perkg"
              type="number"
              min={0}
              prefix="Rp"
              suffix="/kg"
              value={perKgCost}
              onChange={(e) => setPerKgCost(Number(e.target.value))}
            />
          </Field>
        )}
        <Field label={t("adminCustomer.shipping.freeMinLabel")} htmlFor="sm-free" help={t("adminCustomer.shipping.freeMinPlaceholder")}>
          <TextInput
            id="sm-free"
            type="number"
            min={0}
            prefix="Rp"
            value={freeMin}
            onChange={(e) => setFreeMin(e.target.value ? Number(e.target.value) : "")}
          />
        </Field>
      </form>
    </Modal>
  );
}

export default function AdminShippingPage() {
  const { t, locale } = useLanguage();
  const { data: zones, isLoading, isError, refetch } = useAdminShippingZones();
  const [editMethod, setEditMethod] = useState<ShippingMethod | null>(null);

  return (
    <Page>
      <PageHeader
        icon={Settings}
        backHref="/admin/settings"
        backLabel={t("nav.admin.settings")}
        title={t("adminCustomer.shipping.title")}
        subtitle={t("adminCustomer.shipping.subtitle")}
      />

      {isLoading ? (
        <Card>
          <LoadingState label={t("adminCustomer.shipping.loading")} />
        </Card>
      ) : isError ? (
        <Card>
          <ErrorState message={t("adminCustomer.shipping.error")} onRetry={() => refetch()} />
        </Card>
      ) : (
        <div className="space-y-4">
          {zones?.map((zone) => {
            const zoneName = zone.name_i18n[locale] || zone.name_i18n.id || zone.name_i18n.en || zone.code;
            return (
              <Card
                key={zone.id}
                flush
                title={
                  <span className="flex items-center gap-2">
                    <Truck className="size-4 text-admin-muted" /> {zoneName}
                    {!zone.is_active && <Badge>{t("adminCustomer.shipping.inactive")}</Badge>}
                  </span>
                }
                description={t("admin.shipping.provinces", { n: zone.provinces.length })}
              >
                <CardSection className="border-t-0 pt-0">
                  <div className="flex flex-wrap gap-1">
                    {zone.provinces.map((prov) => (
                      <Badge key={prov}>{prov}</Badge>
                    ))}
                  </div>
                </CardSection>
                <div className="border-t border-admin-border">
                  <DataTable>
                    <thead>
                      <tr>
                        <Th>{t("adminCustomer.shipping.methodCol")}</Th>
                        <Th>{t("adminCustomer.shipping.rateTypeCol")}</Th>
                        <Th align="right">{t("adminCustomer.shipping.baseCostCol")}</Th>
                        <Th align="right">{t("adminCustomer.shipping.perKgCol")}</Th>
                        <Th>{t("adminCustomer.shipping.freeMinCol")}</Th>
                        <Th>
                          <span className="sr-only">{t("adminCustomer.shipping.actionCol")}</span>
                        </Th>
                      </tr>
                    </thead>
                    <tbody>
                      {zone.methods.map((m) => {
                        const methodName = m.name_i18n[locale] || m.name_i18n.id || m.name_i18n.en || m.code;
                        return (
                          <Tr key={m.id} className="cursor-pointer" onClick={() => setEditMethod(m)}>
                            <Td>
                              <p className="font-semibold">{methodName}</p>
                              <p className="text-xs text-admin-muted">
                                {t("customer.shippingPicker.estimate", { min: m.eta_min_days, max: m.eta_max_days })}
                              </p>
                            </Td>
                            <Td>
                              <Badge tone={m.rate_type === "flat" ? "neutral" : "info"}>
                                {m.rate_type === "flat" ? t("adminCustomer.shipping.flat") : t("adminCustomer.shipping.perKg")}
                              </Badge>
                            </Td>
                            <Td align="right" className="tabular-nums">
                              {formatRupiah(m.base_cost)}
                            </Td>
                            <Td align="right" className="tabular-nums">
                              {m.rate_type === "per_kg" ? formatRupiah(m.per_kg_cost) : "—"}
                            </Td>
                            <Td>
                              {m.free_shipping_min_subtotal ? (
                                <Badge tone="success">
                                  {t("adminCustomer.shipping.minSpend", { amount: formatRupiah(m.free_shipping_min_subtotal) })}
                                </Badge>
                              ) : (
                                <span className="text-admin-muted">—</span>
                              )}
                            </Td>
                            <Td align="right" className="w-12">
                              <Button
                                variant="tertiary"
                                size="icon-slim"
                                aria-label={`${t("admin.common.edit")} ${methodName}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditMethod(m);
                                }}
                              >
                                <Pencil />
                              </Button>
                            </Td>
                          </Tr>
                        );
                      })}
                    </tbody>
                  </DataTable>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editMethod && <EditMethodModal key={editMethod.id} method={editMethod} onClose={() => setEditMethod(null)} />}
    </Page>
  );
}
