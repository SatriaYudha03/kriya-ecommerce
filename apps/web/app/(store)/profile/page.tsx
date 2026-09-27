"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Package, Save, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/kriya/auth-provider";
import { useLanguage } from "@/components/kriya/language-provider";
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
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading } = useProfile(Boolean(user));

  const [form, setForm] = useState<Profile>(EMPTY);
  const [seeded, setSeeded] = useState(false);

  // Arahkan ke login bila belum masuk.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/profile");
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
      toast.success(t("customer.profile.saved"));
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t("customer.profile.saveError"));
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
    return <div className="p-20 text-center text-neutral-500">{t("customer.profile.loading")}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{t("customer.profile.title")}</h1>
        <p className="mt-2 max-w-xl text-sm text-neutral-500">
          {t("customer.profile.subtitle")}
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
              <h2 className="text-lg font-medium">{t("customer.profile.personalInfo")}</h2>
            </div>

            {user?.email && (
              <p className="mt-3 text-sm text-neutral-500">
                {t("customer.profile.account")}: <span className="font-medium text-neutral-700">{user.email}</span>
              </p>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="full_name" className="block text-sm font-medium text-neutral-700">
                  {t("customer.profile.fullName")}
                </label>
                <input
                  id="full_name"
                  type="text"
                  autoComplete="name"
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                  placeholder={t("customer.profile.fullNamePlaceholder")}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="phone" className="block text-sm font-medium text-neutral-700">
                  {t("customer.profile.phone")}
                </label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder={t("customer.profile.phonePlaceholder")}
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3 text-neutral-900">
              <MapPin className="h-5 w-5 text-brand" />
              <div>
                <h2 className="text-lg font-medium">{t("customer.profile.addressBook")}</h2>
                <p className="text-sm text-neutral-500">{t("customer.profile.addressBookDesc")}</p>
              </div>
            </div>
            <Link href="/account/addresses" className="inline-flex items-center justify-center rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-400">
              {t("customer.profile.viewAddresses")}
            </Link>
          </section>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
            >
              <Package className="h-4 w-4" />
              {t("customer.profile.myOrders")}
            </Link>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
            >
              <Save className="h-4 w-4" />
              {mutation.isPending ? t("customer.profile.saving") : t("customer.profile.save")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
