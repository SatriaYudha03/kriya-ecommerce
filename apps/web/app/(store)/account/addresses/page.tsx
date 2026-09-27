"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, MapPin, ChevronLeft, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/components/kriya/auth-provider";
import { useAddresses, useProvinces, useAddressMutations } from "@/lib/customer/queries";
import { useLanguage } from "@/components/kriya/language-provider";
import type { AddressInput, Address } from "@/lib/customer/types";
import { toast } from "sonner";

const EMPTY: AddressInput = {
  label: "Rumah",
  recipient: "",
  phone: "",
  address_line: "",
  district: "",
  city: "",
  province_code: "",
  postal_code: "",
  notes: "",
  is_default: false,
};

export default function AddressesPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { data: addresses, isLoading, isError, refetch } = useAddresses(Boolean(user));
  const { data: provinces } = useProvinces();
  const { create, update, remove, setAsDefault } = useAddressMutations();

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<AddressInput>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/account/addresses");
    }
  }, [authLoading, user, router]);

  if (authLoading || (!user && !authLoading)) {
    return <div className="p-20 text-center text-neutral-500">{t("customer.addresses.loading")}</div>;
  }

  function openNew() {
    setForm(EMPTY);
    setEditingId(null);
    setIsOpen(true);
  }

  function openEdit(addr: Address) {
    setForm({
      label: addr.label,
      recipient: addr.recipient,
      phone: addr.phone,
      address_line: addr.address_line,
      district: addr.district || "",
      city: addr.city,
      province_code: addr.province_code,
      postal_code: addr.postal_code,
      notes: addr.notes || "",
      is_default: addr.is_default,
    });
    setEditingId(addr.id);
    setIsOpen(true);
  }

  function handleDelete(id: string) {
    if (confirm(t("customer.addresses.deleteConfirm"))) {
      remove.mutate(id, {
        onSuccess: () => toast.success(t("customer.addresses.deleted")),
        onError: (err: Error) => toast.error(err.message),
      });
    }
  }

  function handleSetDefault(id: string) {
    setAsDefault.mutate(id, {
      onSuccess: () => toast.success(t("customer.addresses.defaultUpdated")),
      onError: (err: Error) => toast.error(err.message),
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      update.mutate({ id: editingId, payload: form }, {
        onSuccess: () => {
          toast.success(t("customer.addresses.updated"));
          setIsOpen(false);
        },
        onError: (err: Error) => toast.error(err.message),
      });
    } else {
      create.mutate(form, {
        onSuccess: () => {
          toast.success(t("customer.addresses.created"));
          setIsOpen(false);
        },
        onError: (err: Error) => toast.error(err.message),
      });
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/profile" className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-900 mb-6">
        <ChevronLeft className="h-4 w-4 mr-1" />
        {t("customer.addresses.backToProfile")}
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{t("customer.addresses.title")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("customer.addresses.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand/90 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          {t("customer.addresses.addNew")}
        </button>
      </div>

      <div className="mt-8 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-28 animate-pulse rounded-xl bg-neutral-100" />
            <div className="h-28 animate-pulse rounded-xl bg-neutral-100" />
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
            <AlertCircle className="mx-auto h-8 w-8 mb-2 text-red-500" />
            <p className="text-sm font-medium">{t("customer.addresses.loadError")}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 inline-flex items-center rounded-full bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              Coba lagi
            </button>
          </div>
        ) : addresses?.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg text-neutral-500">
            <MapPin className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>{t("customer.addresses.empty")}</p>
          </div>
        ) : (
          addresses?.map((addr) => (
            <div key={addr.id} className="p-5 border border-neutral-200 rounded-xl bg-white shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-900">{addr.label}</span>
                  {addr.is_default && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded text-brand bg-brand/10 tracking-wider">
                      {t("customer.addresses.defaultBadge")}
                    </span>
                  )}
                </div>
                <h2 className="mt-2 font-medium text-neutral-900">{addr.recipient} <span className="font-normal text-neutral-500">({addr.phone})</span></h2>
                <p className="mt-1 text-sm text-neutral-600 line-clamp-2">{addr.address_line}</p>
                <p className="text-sm text-neutral-600">{addr.district ? `${addr.district}, ` : ""}{addr.city}, {addr.province} {addr.postal_code}</p>
                {addr.notes && <p className="mt-1 text-xs text-neutral-500 italic">{addr.notes}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {!addr.is_default && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(addr.id)}
                    className="text-sm font-medium text-brand hover:underline focus:outline-none focus:ring-1 focus:ring-brand rounded"
                  >
                    {t("customer.addresses.setDefault")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEdit(addr)}
                  className="text-neutral-400 hover:text-neutral-900 p-1 rounded focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  aria-label={`${t("customer.addresses.edit")} ${addr.label}`}
                  title={t("customer.addresses.edit")}
                >
                  <Pencil className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(addr.id)}
                  className="text-neutral-400 hover:text-red-600 p-1 rounded focus:outline-none focus:ring-1 focus:ring-red-400"
                  aria-label={`${t("customer.addresses.delete")} ${addr.label}`}
                  title={t("customer.addresses.delete")}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="address-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 id="address-dialog-title" className="text-lg font-semibold">
                {editingId ? t("customer.addresses.modalEdit") : t("customer.addresses.modalAdd")}
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-neutral-900 p-1 text-xl leading-none"
                aria-label={t("customer.addresses.closeModal")}
              >
                &times;
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label htmlFor="address_form_label" className="block text-sm font-medium mb-1">
                      {t("customer.addresses.label")}
                    </label>
                    <input
                      id="address_form_label"
                      required
                      maxLength={40}
                      className="w-full rounded-md border p-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                      placeholder={t("customer.addresses.labelPlaceholder")}
                      value={form.label}
                      onChange={(e) => setForm({ ...form, label: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1">
                    <label htmlFor="address_form_recipient" className="block text-sm font-medium mb-1">
                      {t("customer.addresses.recipient")}
                    </label>
                    <input
                      id="address_form_recipient"
                      required
                      maxLength={100}
                      className="w-full rounded-md border p-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                      value={form.recipient}
                      onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1">
                    <label htmlFor="address_form_phone" className="block text-sm font-medium mb-1">
                      {t("customer.addresses.phone")}
                    </label>
                    <input
                      id="address_form_phone"
                      required
                      pattern="^(\+62|0)8[0-9]{7,12}$"
                      className="w-full rounded-md border p-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                      placeholder="08123456789"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="address_form_line" className="block text-sm font-medium mb-1">
                      {t("customer.addresses.addressLine")}
                    </label>
                    <textarea
                      id="address_form_line"
                      required
                      minLength={5}
                      maxLength={300}
                      rows={3}
                      className="w-full rounded-md border p-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                      placeholder={t("customer.addresses.addressLinePlaceholder")}
                      value={form.address_line}
                      onChange={(e) => setForm({ ...form, address_line: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1">
                    <label htmlFor="address_form_district" className="block text-sm font-medium mb-1">
                      {t("customer.addresses.district")}
                    </label>
                    <input
                      id="address_form_district"
                      className="w-full rounded-md border p-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                      value={form.district || ""}
                      onChange={(e) => setForm({ ...form, district: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1">
                    <label htmlFor="address_form_city" className="block text-sm font-medium mb-1">
                      {t("customer.addresses.city")}
                    </label>
                    <input
                      id="address_form_city"
                      required
                      className="w-full rounded-md border p-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1">
                    <label htmlFor="address_form_province" className="block text-sm font-medium mb-1">
                      {t("customer.addresses.province")}
                    </label>
                    <select
                      id="address_form_province"
                      required
                      className="w-full rounded-md border p-2 text-sm bg-white focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                      value={form.province_code}
                      onChange={(e) => setForm({ ...form, province_code: e.target.value })}
                    >
                      <option value="" disabled>{t("customer.addresses.selectProvince")}</option>
                      {provinces?.map((p) => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label htmlFor="address_form_postal" className="block text-sm font-medium mb-1">
                      {t("customer.addresses.postalCode")}
                    </label>
                    <input
                      id="address_form_postal"
                      required
                      pattern="^[0-9]{5}$"
                      className="w-full rounded-md border p-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                      value={form.postal_code}
                      onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="address_form_notes" className="block text-sm font-medium mb-1">
                      {t("customer.addresses.notes")}
                    </label>
                    <input
                      id="address_form_notes"
                      maxLength={200}
                      className="w-full rounded-md border p-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                      placeholder={t("customer.addresses.notesPlaceholder")}
                      value={form.notes || ""}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                  {!editingId && addresses && addresses.length > 0 && (
                    <div className="col-span-2 flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id="is_default"
                        className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
                        checked={form.is_default}
                        onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                      />
                      <label htmlFor="is_default" className="text-sm cursor-pointer select-none">
                        {t("customer.addresses.setAsDefaultCheckbox")}
                      </label>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-sm font-medium rounded-full hover:bg-neutral-100"
                  >
                    {t("customer.addresses.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-6 py-2 text-sm font-medium text-white rounded-full bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isPending ? t("customer.addresses.saving") : t("customer.addresses.save")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
