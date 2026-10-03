"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cart-store";
import { SocialLoginButtons } from "@/components/kriya/social-login-buttons";
import { useLanguage } from "@/components/kriya/language-provider";
import { applySignupProfile } from "@/lib/customer/signup-profile";
import {
  AuthCard,
  authInputClass,
  authLabelClass,
  authSubmitClass,
} from "@/components/kriya/auth-card";

// Sama dengan validasi telepon di BE (customer/address_handler.go).
const PHONE_PATTERN = "(\\+62|0)8[0-9]{7,12}";

function RegisterForm() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const syncFromServer = useCartStore((s) => s.syncFromServer);
  const { t } = useLanguage();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim(), phone: phone.trim() },
        },
      });

      if (error) throw error;

      if (data.session) {
        await applySignupProfile(data.session.user);
        await syncFromServer();
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
    <AuthCard
      image="signup"
      footer={
        <>
          {t("auth.register.hasAccount")}{" "}
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="ml-1 font-semibold text-neutral-900 hover:text-brand-strong"
          >
            {t("auth.register.loginHere")}
          </Link>
        </>
      }
    >
      <h1 className="sr-only">{t("auth.register.title")}</h1>
      <form onSubmit={handleRegister} className="space-y-6">
        <div>
          <label htmlFor="register-name" className={authLabelClass}>
            {t("auth.register.name")} *
          </label>
          <input
            id="register-name"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t("auth.register.namePlaceholder")}
            required
            maxLength={100}
            className={authInputClass}
          />
        </div>
        <div>
          <label htmlFor="register-phone" className={authLabelClass}>
            {t("auth.register.phone")} *
          </label>
          <input
            id="register-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[\s-]/g, ""))}
            placeholder={t("auth.register.phonePlaceholder")}
            required
            pattern={PHONE_PATTERN}
            title={t("auth.register.phoneHint")}
            aria-describedby="register-phone-hint"
            className={authInputClass}
          />
          <p id="register-phone-hint" className="mt-1.5 text-xs text-neutral-500">
            {t("auth.register.phoneHint")}
          </p>
        </div>
        <div>
          <label htmlFor="register-email" className={authLabelClass}>
            {t("auth.login.email")} *
          </label>
          <input
            id="register-email"
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
          <label htmlFor="register-password" className={authLabelClass}>
            {t("auth.login.password")} *
          </label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.login.passwordPlaceholder")}
            required
            minLength={6}
            aria-describedby="register-password-hint"
            className={authInputClass}
          />
          <p id="register-password-hint" className="mt-1.5 text-xs text-neutral-500">
            {t("auth.register.passwordHint")}
          </p>
        </div>
        <button type="submit" disabled={loading} className={authSubmitClass}>
          {loading ? t("auth.login.processing") : t("auth.register.submit")}
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

export default function RegisterPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<div className="py-24 text-center text-sm text-neutral-500">{t("auth.loading")}</div>}>
      <RegisterForm />
    </Suspense>
  );
}
