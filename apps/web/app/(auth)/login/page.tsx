"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCartStore } from "@/stores/cart-store";
import { toast } from "sonner";
import { SocialLoginButtons } from "@/components/kriya/social-login-buttons";
import { useLanguage } from "@/components/kriya/language-provider";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const syncFromServer = useCartStore((s) => s.syncFromServer);
  const { t } = useLanguage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      if (data.session) {
        await syncFromServer(); // Sync cart from server
        toast.success(t("auth.login.success" as any));
        router.push(next);
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("auth.login.error" as any));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mt-8">
        <SocialLoginButtons next={next} />
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-neutral-400">{t("auth.login.or" as any)}</span>
        </div>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">{t("auth.login.email" as any)}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">{t("auth.login.password" as any)}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? t("auth.login.processing" as any) : t("auth.login.submit" as any)}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-600">
        {t("auth.login.noAccount" as any)}{" "}
        <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-medium text-brand-strong hover:underline">
          {t("auth.login.registerNow" as any)}
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  const { t } = useLanguage();
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-neutral-900">{t("auth.login.title2" as any)}</h1>
      <p className="mt-2 text-sm text-neutral-500">
        {t("auth.login.subtitle" as any)}
      </p>
      <Suspense fallback={<div className="mt-8 text-center text-sm text-neutral-500">{t("auth.loading" as any)}</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
