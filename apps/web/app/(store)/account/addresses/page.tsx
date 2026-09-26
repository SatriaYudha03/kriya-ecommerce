"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, MapPin, ChevronLeft } from "lucide-react";
import { useAuth } from "@/components/kriya/auth-provider";
import { useAddresses, useProvinces, useAddressMutations } from "@/lib/customer/queries";
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
  const { user, loading: authLoading } = useAuth();
  const { data: addresses, isLoading } = useAddresses(Boolean(user));
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
    return <div className="p-20 text-center text-neutral-500">Memuat…</div>;
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
    if (confirm("Hapus alamat ini?")) {
      remove.mutate(id, {
        onSuccess: () => toast.success("Alamat dihapus"),
        onError: (err: Error) => toast.error(err.message),
      });
    }
  }

  function handleSetDefault(id: string) {
    setAsDefault.mutate(id, {
      onSuccess: () => toast.success("Alamat utama diperbarui"),
      onError: (err: Error) => toast.error(err.message),
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      update.mutate({ id: editingId, payload: form }, {
        onSuccess: () => {
          toast.success("Alamat diperbarui");
          setIsOpen(false);
        },
        onError: (err: Error) => toast.error(err.message),
      });
    } else {
      create.mutate(form, {
        onSuccess: () => {
          toast.success("Alamat ditambahkan");
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
        Kembali ke Profil
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Buku Alamat</h1>
          <p className="mt-1 text-sm text-neutral-500">Kelola alamat pengiriman untuk pesananmu.</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand/90"
        >
          <Plus className="h-4 w-4" />
          Tambah alamat
        </button>
      </div>

      <div className="mt-8 space-y-4">
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-neutral-100" />
        ) : addresses?.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg text-neutral-500">
            <MapPin className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>Belum ada alamat pengiriman.</p>
          </div>
        ) : (
          addresses?.map((addr) => (
            <div key={addr.id} className="p-5 border border-neutral-200 rounded-xl bg-white shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-900">{addr.label}</span>
                  {addr.is_default && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded text-brand bg-brand/10">UTAMA</span>
                  )}
                </div>
                <h3 className="mt-2 font-medium text-neutral-900">{addr.recipient} <span className="font-normal text-neutral-500">({addr.phone})</span></h3>
                <p className="mt-1 text-sm text-neutral-600 line-clamp-2">{addr.address_line}</p>
                <p className="text-sm text-neutral-600">{addr.district ? `${addr.district}, ` : ""}{addr.city}, {addr.province} {addr.postal_code}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {!addr.is_default && (
                  <button onClick={() => handleSetDefault(addr.id)} className="text-sm font-medium text-brand hover:underline">
                    Jadikan Utama
                  </button>
                )}
                <button onClick={() => openEdit(addr)} className="text-neutral-400 hover:text-neutral-900" title="Ubah">
                  <Pencil className="h-5 w-5" />
                </button>
                <button onClick={() => handleDelete(addr.id)} className="text-neutral-400 hover:text-red-600" title="Hapus">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editingId ? "Ubah Alamat" : "Tambah Alamat Baru"}</h2>
              <button onClick={() => setIsOpen(false)} className="text-neutral-400 hover:text-neutral-900">&times;</button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Label Alamat</label>
                    <input
                      required maxLength={40}
                      className="w-full rounded-md border p-2 text-sm"
                      placeholder="Rumah, Kantor, dsb."
                      value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium mb-1">Nama Penerima</label>
                    <input
                      required maxLength={100}
                      className="w-full rounded-md border p-2 text-sm"
                      value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium mb-1">Nomor Telepon</label>
                    <input
                      required pattern="^(\+62|0)8[0-9]{7,12}$"
                      className="w-full rounded-md border p-2 text-sm"
                      placeholder="08123456789"
                      value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Alamat Lengkap</label>
                    <textarea
                      required minLength={5} maxLength={300} rows={3}
                      className="w-full rounded-md border p-2 text-sm"
                      placeholder="Jalan, RT/RW, Nomor Rumah"
                      value={form.address_line} onChange={(e) => setForm({ ...form, address_line: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium mb-1">Kecamatan (Opsional)</label>
                    <input
                      className="w-full rounded-md border p-2 text-sm"
                      value={form.district || ""} onChange={(e) => setForm({ ...form, district: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium mb-1">Kota / Kabupaten</label>
                    <input
                      required
                      className="w-full rounded-md border p-2 text-sm"
                      value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium mb-1">Provinsi</label>
                    <select
                      required
                      className="w-full rounded-md border p-2 text-sm bg-white"
                      value={form.province_code} onChange={(e) => setForm({ ...form, province_code: e.target.value })}
                    >
                      <option value="" disabled>Pilih Provinsi</option>
                      {provinces?.map((p) => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium mb-1">Kode Pos</label>
                    <input
                      required pattern="^[0-9]{5}$"
                      className="w-full rounded-md border p-2 text-sm"
                      value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Catatan Tambahan (Opsional)</label>
                    <input
                      maxLength={200}
                      className="w-full rounded-md border p-2 text-sm"
                      placeholder="Warna pagar, patokan, dll."
                      value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                  {!editingId && addresses && addresses.length > 0 && (
                    <div className="col-span-2 flex items-center gap-2 mt-2">
                      <input
                        type="checkbox" id="is_default"
                        checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                      />
                      <label htmlFor="is_default" className="text-sm">Jadikan sebagai alamat utama</label>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
                  <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium rounded-full hover:bg-neutral-100">Batal</button>
                  <button type="submit" disabled={isPending} className="px-6 py-2 text-sm font-medium text-white rounded-full bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50">
                    {isPending ? "Menyimpan..." : "Simpan"}
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
