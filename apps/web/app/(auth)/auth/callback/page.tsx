"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCartStore } from "@/stores/cart-store";
import { AuthCard } from "@/components/kriya/auth-card";
import { applySignupProfile } from "@/lib/customer/signup-profile";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const syncFromServer = useCartStore((s) => s.syncFromServer);

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await applySignupProfile(data.session.user);
        await syncFromServer();
      }
      const next = searchParams.get("next") || "/";
      router.replace(next);
    }

    handleCallback();
  }, [router, searchParams, syncFromServer]);

  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      <p className="text-sm font-medium text-neutral-600">Meresmikan sesi...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <AuthCard>
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
            <p className="text-sm font-medium text-neutral-600">
              Meresmikan sesi...
            </p>
          </div>
        }
      >
        <CallbackHandler />
      </Suspense>
    </AuthCard>
  );
}
