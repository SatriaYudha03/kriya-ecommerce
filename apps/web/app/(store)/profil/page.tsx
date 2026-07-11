"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Package, Save, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/kriya/auth-provider";
import { useProfile } from "@/lib/queries";
import { updateProfile } from "@/lib/api";
import type { Profile } from "@/lib/types";

const EMPTY: Profile = {
  full_name: "",
  phone: "",
  address_line: "",
  city: "",
  province: "",
  postal_code: "",
};

const inputCls =
  "mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none";

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading } = useProfile(Boolean(user));

  const [form, setForm] = useState<Profile>(EMPTY);
  const [seeded, setSeeded] = useState(false);

  // Arahkan ke login bila belum masuk.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/profil");
    }
  }, [authLoading, user, router]);

  // Isi form dari profil tersimpan sekali saat data tiba (pola adjust-state
  // saat render, bukan di effect — menghindari cascading render).
  if (profile && !seeded) {
    setSeeded(true);
    setForm({ ...EMPTY, ...profile });
  }

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (saved) => {
      queryClient.setQueryData(["profile"], saved);
      toast.success("Profil tersimpan. Alamat ini akan otomatis terisi di checkout.");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan profil");
    },
  });

  function set<K extends keyof Profile>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(form);
  }

  if (authLoading || (!user && !authLoading)) {
    return <div className="p-20 text-center text-neutral-500">Memuat…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Profil saya</h1>
        <p className="mt-2 max-w-xl text-sm text-neutral-500">
          Simpan data diri dan alamat pengirimanmu di sini. Data ini akan terisi otomatis
          saat checkout, jadi kamu tidak perlu mengetik ulang setiap kali belanja.
        </p>
      </header>

      {isLoading ? (
        <div className="mt-10 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-10">
          {/* Data diri */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-neutral-900">
              <UserRound className="h-5 w-5 text-brand" />
              <h2 className="text-lg font-medium">Data diri</h2>
            </div>

            {user?.email && (
              <p className="mt-3 text-sm text-neutral-500">
                Akun: <span className="font-medium text-neutral-700">{user.email}</span>
              </p>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="full_name" className="block text-sm font-medium text-neutral-700">
                  Nama lengkap
                </label>
                <input
                  id="full_name"
                  type="text"
                  autoComplete="name"
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                  placeholder="mis. Satria Yudha"
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="phone" className="block text-sm font-medium text-neutral-700">
                  Nomor telepon
                </label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="mis. 081234567890"
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          {/* Alamat pengiriman */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-neutral-900">
              <MapPin className="h-5 w-5 text-brand" />
              <h2 className="text-lg font-medium">Alamat pengiriman</h2>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="address_line" className="block text-sm font-medium text-neutral-700">
                  Alamat lengkap
                </label>
                <textarea
                  id="address_line"
                  rows={3}
                  autoComplete="street-address"
                  value={form.address_line}
                  onChange={(e) => set("address_line", e.target.value)}
                  placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-neutral-700">
                  Kota / Kabupaten
                </label>
                <input
                  id="city"
                  type="text"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="province" className="block text-sm font-medium text-neutral-700">
                  Provinsi
                </label>
                <input
                  id="province"
                  type="text"
                  autoComplete="address-level1"
                  value={form.province}
                  onChange={(e) => set("province", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="postal_code" className="block text-sm font-medium text-neutral-700">
                  Kode pos
                </label>
                <input
                  id="postal_code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={form.postal_code}
                  onChange={(e) => set("postal_code", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/pesanan"
              className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
            >
              <Package className="h-4 w-4" />
              Lihat pesanan saya
            </Link>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {mutation.isPending ? "Menyimpan…" : "Simpan profil"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
