"use client";

// Form kurir + nomor resi sebelum pesanan ditandai "Dikirim" — dipakai di daftar
// dan detail pesanan agar alurnya sama persis.

import { useState } from "react";
import { useLanguage } from "@/components/kriya/language-provider";
import { useUpdateOrderStatus } from "@/lib/aftersales/queries";
import { Button, Field, Modal, TextInput } from "./ui";

export function ShipOrderModal({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const { t } = useLanguage();
  const updateStatus = useUpdateOrderStatus();
  const [courier, setCourier] = useState("");
  const [tracking, setTracking] = useState("");

  const close = () => {
    setCourier("");
    setTracking("");
    onClose();
  };

  const submit = () => {
    if (!orderId) return;
    updateStatus.mutate(
      { id: orderId, status: "shipped", courier: courier.trim(), trackingNumber: tracking.trim() },
      { onSuccess: close },
    );
  };

  return (
    <Modal
      open={orderId !== null}
      onClose={close}
      title={t("after.admin.orders.ship.title")}
      size="sm"
      footer={
        <>
          <Button onClick={close}>{t("after.admin.orders.ship.cancel")}</Button>
          <Button
            variant="primary"
            loading={updateStatus.isPending}
            disabled={!courier.trim() || !tracking.trim()}
            onClick={submit}
          >
            {t("after.admin.orders.ship.submit")}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-[13px] text-admin-muted">{t("after.admin.orders.ship.desc")}</p>
      <div className="space-y-4">
        <Field label={t("after.admin.orders.ship.courier")} htmlFor="ship-courier">
          <TextInput
            id="ship-courier"
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
            placeholder={t("after.admin.orders.ship.courierPlaceholder")}
          />
        </Field>
        <Field label={t("after.admin.orders.ship.tracking")} htmlFor="ship-tracking">
          <TextInput
            id="ship-tracking"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder={t("after.admin.orders.ship.trackingPlaceholder")}
          />
        </Field>
      </div>
    </Modal>
  );
}
