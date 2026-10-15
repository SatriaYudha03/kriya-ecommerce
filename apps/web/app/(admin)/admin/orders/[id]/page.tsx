"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Inbox, Truck } from "lucide-react";
import { getAdminOrder, updateAdminOrderStatus, addAdminOrderNote } from "@/lib/aftersales/api";
import { afterKeys } from "@/lib/aftersales/queries";
import { promoKeys } from "@/lib/promo/queries";
import { ApiError } from "@/lib/http";
import { formatRupiah } from "@/lib/format";
import type { OrderStatus } from "@/lib/aftersales/types";
import { useLanguage } from "@/components/kriya/language-provider";
import { OrderBadge } from "@/components/kriya/admin/status-badges";
import { ShipOrderModal } from "@/components/kriya/admin/ship-order-modal";
import { RefundOrderModal } from "@/components/kriya/admin/refund-order-modal";
import {
  Badge,
  Button,
  Card,
  CardSection,
  Checkbox,
  ErrorState,
  Field,
  InfoItem,
  InfoList,
  Layout,
  LayoutAside,
  LayoutMain,
  LoadingState,
  Page,
  PageHeader,
  SelectInput,
  SummaryRow,
  TextArea,
  TextInput,
  Thumbnail,
  useAdminFormat,
} from "@/components/kriya/admin/ui";

const NEXT_STATUSES: OrderStatus[] = ["processing", "shipped", "completed", "cancelled", "refunded"];

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const fmt = useAdminFormat();
  const queryClient = useQueryClient();
  const [statusInput, setStatusInput] = useState<OrderStatus | "">("");
  const [courier, setCourier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [isCustomerVisible, setIsCustomerVisible] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  // Key di bawah afterKeys.all → ikut segar saat status diubah dari mana pun.
  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: [...afterKeys.all, "admin-order", id],
    queryFn: () => getAdminOrder(id),
  });

  const statusMut = useMutation({
    mutationFn: () =>
      updateAdminOrderStatus(id, statusInput as OrderStatus, undefined, courier || undefined, trackingNumber || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: afterKeys.all });
      queryClient.invalidateQueries({ queryKey: promoKeys.stats() });
      toast.success(t("after.admin.orders.statusUpdated"));
      setStatusInput("");
      setCourier("");
      setTrackingNumber("");
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : t("after.admin.orders.statusUpdateFailed")),
  });

  const noteMut = useMutation({
    mutationFn: () => addAdminOrderNote(id, noteBody, isCustomerVisible),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...afterKeys.all, "admin-order", id] });
      setNoteBody("");
      setIsCustomerVisible(false);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : t("admin.common.saveFailed")),
  });

  if (isLoading) {
    return (
      <Page>
        <LoadingState />
      </Page>
    );
  }
  if (isError || !order) {
    return (
      <Page>
        <PageHeader icon={Inbox} backHref="/admin/orders" backLabel={t("nav.admin.orders")} title={t("admin.orders.detail")} />
        <Card>
          <ErrorState message={t("admin.orders.notFound")} onRetry={() => refetch()} />
        </Card>
      </Page>
    );
  }

  const itemCount = order.items.reduce((sum, i) => sum + i.qty, 0);
  const canShip = order.status === "paid" || order.status === "processing";
  const canRefund =
    (order.status === "completed" || order.status === "cancelled" || order.status === "refunded") &&
    order.items.some((item) => item.qty - item.refunded_qty > 0);
  const addr = order.shipping_address;

  return (
    <Page>
      <PageHeader
        icon={Inbox}
        backHref="/admin/orders"
        backLabel={t("nav.admin.orders")}
        title={order.order_number || order.id.split("-")[0].toUpperCase()}
        badge={<OrderBadge status={order.status} />}
        subtitle={fmt.dateTime(order.created_at)}
        actions={
          <>
            {canRefund && <Button onClick={() => setRefundOpen(true)}>{t("admin.refund.title")}</Button>}
            {canShip && (
              <Button variant="primary" onClick={() => setShipOpen(true)}>
                <Truck /> {t("after.admin.orders.ship.submit")}
              </Button>
            )}
          </>
        }
      />

      <Layout>
        <LayoutMain>
          <Card
            flush
            title={
              <span className="flex items-center gap-2">
                {t("admin.orders.items")} <Badge>{itemCount}</Badge>
              </span>
            }
          >
            {order.items.length === 0 && (
              <p className="border-t border-admin-border px-4 py-6 text-center text-admin-muted">{t("admin.orders.noItems")}</p>
            )}
            <ul>
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-3 border-t border-admin-border px-4 py-3">
                  <Thumbnail src={item.thumbnail_url} alt={item.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-admin-text">{item.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.color && <Badge>{item.color}</Badge>}
                      {item.size && <Badge>{item.size}</Badge>}
                    </div>
                    {item.sku && <p className="mt-1 text-xs text-admin-muted">SKU: {item.sku}</p>}
                    {item.refunded_qty > 0 && (
                      <p className="mt-1 text-xs text-admin-critical">
                        {t("admin.orders.refundedQty", { n: item.refunded_qty })}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className="text-admin-muted">
                      {formatRupiah(item.price)} × {item.qty}
                    </p>
                    <p className="mt-1 font-semibold">{formatRupiah(item.subtotal)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title={t("admin.orders.payment")}>
            <div className="space-y-2.5">
              <SummaryRow
                label={t("admin.orders.subtotal")}
                hint={t("admin.orders.itemsCount", { n: itemCount })}
                value={formatRupiah(order.subtotal)}
              />
              {order.discount_total > 0 && (
                <SummaryRow
                  label={t("admin.orders.discount")}
                  hint={order.coupon_code ?? undefined}
                  value={`−${formatRupiah(order.discount_total)}`}
                />
              )}
              <SummaryRow
                label={t("admin.orders.shipping")}
                hint={order.shipping_method?.name}
                value={formatRupiah(order.shipping_cost - order.shipping_discount)}
              />
              {order.tax_amount > 0 && <SummaryRow label={t("admin.orders.tax")} value={formatRupiah(order.tax_amount)} />}
              <div className="border-t border-admin-border pt-2.5">
                <SummaryRow strong label={t("admin.orders.total")} value={formatRupiah(order.total)} />
              </div>
              {order.paid_at && (
                <SummaryRow label={t("admin.orders.paidAt")} value={<span className="text-admin-muted">{fmt.dateTime(order.paid_at)}</span>} />
              )}
            </div>
          </Card>

          <Card flush title={t("admin.orders.timeline")}>
            <CardSection>
              <div className="space-y-2">
                <TextArea
                  rows={2}
                  placeholder={t("admin.orders.notePlaceholder")}
                  aria-label={t("admin.orders.notePlaceholder")}
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Checkbox
                    label={t("admin.orders.noteVisible")}
                    checked={isCustomerVisible}
                    onChange={(e) => setIsCustomerVisible(e.target.checked)}
                  />
                  <Button
                    size="slim"
                    variant="primary"
                    loading={noteMut.isPending}
                    disabled={!noteBody.trim()}
                    onClick={() => noteMut.mutate()}
                  >
                    {t("admin.orders.notePost")}
                  </Button>
                </div>
              </div>
            </CardSection>
            {order.notes && order.notes.length > 0 && (
              <CardSection title={t("admin.orders.notes")}>
                <ul className="space-y-2">
                  {order.notes.map((n) => (
                    <li key={n.id} className="rounded-lg bg-admin-subdued p-3">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{n.author_name || "Admin"}</span>
                        {n.is_customer_visible && <Badge tone="info">{t("admin.orders.noteVisibleBadge")}</Badge>}
                        <span className="ml-auto text-xs text-admin-muted">{fmt.dateTime(n.created_at)}</span>
                      </div>
                      <p className="whitespace-pre-line">{n.body}</p>
                    </li>
                  ))}
                </ul>
              </CardSection>
            )}
            {order.timeline && order.timeline.length > 0 && (
              <CardSection title={t("admin.orders.history")}>
                <ol className="relative ml-1.5 space-y-4 border-l border-[#d4d4d4] pl-5">
                  {order.timeline.map((ev, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[25px] top-1 size-2.5 rounded-full border-2 border-white bg-[#8a8a8a] ring-1 ring-[#d4d4d4]" />
                      <div className="flex flex-wrap items-center gap-2">
                        <OrderBadge status={ev.status} />
                        <span className="text-xs text-admin-muted">{fmt.dateTime(ev.created_at)}</span>
                      </div>
                      {ev.note && <p className="mt-1 text-admin-muted">{ev.note}</p>}
                    </li>
                  ))}
                </ol>
              </CardSection>
            )}
          </Card>
        </LayoutMain>

        <LayoutAside>
          <Card title={t("admin.orders.updateStatus")}>
            <div className="space-y-3">
              <SelectInput
                value={statusInput}
                aria-label={t("admin.orders.updateStatus")}
                onChange={(e) => setStatusInput(e.target.value as OrderStatus | "")}
              >
                <option value="">{t("admin.orders.chooseStatus")}</option>
                {NEXT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`after.status.${s}` as const)}
                  </option>
                ))}
              </SelectInput>
              {statusInput === "shipped" && (
                <>
                  <Field label={t("after.admin.orders.ship.courier")} htmlFor="st-courier">
                    <TextInput
                      id="st-courier"
                      placeholder={t("after.admin.orders.ship.courierPlaceholder")}
                      value={courier}
                      onChange={(e) => setCourier(e.target.value)}
                    />
                  </Field>
                  <Field label={t("after.admin.orders.ship.tracking")} htmlFor="st-tracking">
                    <TextInput
                      id="st-tracking"
                      placeholder={t("after.admin.orders.ship.trackingPlaceholder")}
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                    />
                  </Field>
                </>
              )}
              <Button
                variant="primary"
                className="w-full"
                loading={statusMut.isPending}
                disabled={!statusInput || (statusInput === "shipped" && (!courier.trim() || !trackingNumber.trim()))}
                onClick={() => statusMut.mutate()}
              >
                {t("admin.orders.updateStatus")}
              </Button>
            </div>
          </Card>

          <Card title={t("admin.orders.customer")}>
            <InfoList>
              <InfoItem label={t("admin.orders.recipient")}>
                <span className="font-semibold">{addr.recipient}</span>
                <span className="block text-admin-muted">{addr.phone}</span>
              </InfoItem>
              <InfoItem label={t("admin.orders.shippingAddress")}>
                {addr.address_line}
                <span className="block">
                  {addr.city}, {addr.province} {addr.postal_code}
                </span>
              </InfoItem>
              {order.shipping_method && (
                <InfoItem label={t("admin.orders.shippingMethod")}>{order.shipping_method.name}</InfoItem>
              )}
              {(order.courier || order.tracking_number) && (
                <InfoItem label={t("admin.orders.tracking")}>
                  {order.courier}
                  {order.tracking_number && (
                    <span className="block select-all font-mono text-xs">{order.tracking_number}</span>
                  )}
                </InfoItem>
              )}
            </InfoList>
          </Card>

          {order.customer_note && (
            <Card title={t("admin.orders.customerNote")}>
              <p className="whitespace-pre-line text-admin-text">{order.customer_note}</p>
            </Card>
          )}
        </LayoutAside>
      </Layout>

      <ShipOrderModal orderId={shipOpen ? order.id : null} onClose={() => setShipOpen(false)} />
      {canRefund && <RefundOrderModal order={order} open={refundOpen} onClose={() => setRefundOpen(false)} />}
    </Page>
  );
}
