"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCartStore } from "@/stores/cart-store";
import { toast } from "sonner";
import { SocialLoginButtons } from "@/components/kriya/social-login-buttons";
import { useLanguage } from "@/components/kriya/language-provider";
import { applySignupProfile } from "@/lib/customer/signup-profile";
import {
  AuthCard,
  authInputClass,
  authLabelClass,
  authSubmitClass,
} from "@/components/kriya/auth-card";

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
        await applySignupProfile(data.session.user);
        await syncFromServer(); // Sync cart from server
        toast.success(t("auth.login.success"));
        router.push(next);
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("auth.login.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      footer={
        <>
          {t("auth.login.noAccount")}{" "}
          <Link
            href={`/register?next=${encodeURIComponent(next)}`}
            className="ml-1 font-semibold text-neutral-900 hover:text-brand-strong"
          >
            {t("auth.login.registerNow")}
          </Link>
        </>
      }
    >
      <h1 className="sr-only">{t("auth.login.title2")}</h1>
      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label htmlFor="login-email" className={authLabelClass}>
            {t("auth.login.email")} *
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.login.emailPlaceholder")}
            required
            className={authInputClass}
          />
        </div>
        <div>
          <label htmlFor="login-password" className={authLabelClass}>
            {t("auth.login.password")} *
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.login.passwordPlaceholder")}
            required
            className={authInputClass}
          />
        </div>
        <button type="submit" disabled={loading} className={authSubmitClass}>
          {loading ? t("auth.login.processing") : t("auth.login.submit")}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-neutral-400">{t("auth.login.or")}</span>
        </div>
      </div>

      <SocialLoginButtons next={next} />
    </AuthCard>
  );
}

export default function LoginPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<div className="py-24 text-center text-sm text-neutral-500">{t("auth.loading")}</div>}>
      <LoginForm />
    </Suspense>
  );
}
