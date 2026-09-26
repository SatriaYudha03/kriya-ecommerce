"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cart-store";
import { SocialLoginButtons } from "@/components/kriya/social-login-buttons";
import { useLanguage } from "@/components/kriya/language-provider";

function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const mergeWithServer = useCartStore((s) => s.mergeWithServer);
  const { t } = useLanguage();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      
      if (data.session) {
        await mergeWithServer();
        toast.success(t("auth.register.success"));
        router.push(next);
      } else {
        toast.success(t("auth.register.checkEmail"));
        router.push("/login");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("auth.register.error"));
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
          <span className="bg-white px-2 text-neutral-400">{t("auth.login.or")}</span>
        </div>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">{t("auth.login.email")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">{t("auth.login.password")}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? t("auth.login.processing") : t("auth.register.submit")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-600">
        {t("auth.register.hasAccount")}{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-brand-strong hover:underline">
          {t("auth.register.loginHere")}
        </Link>
      </p>
    </>
  );
}

export default function RegisterPage() {
  const { t } = useLanguage();
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-neutral-900">{t("auth.register.title")}</h1>
      <p className="mt-2 text-sm text-neutral-500">
        {t("auth.register.subtitle")}
      </p>
      <Suspense fallback={<div className="mt-8 text-center text-sm text-neutral-500">{t("auth.loading")}</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
