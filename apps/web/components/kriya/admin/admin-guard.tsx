"use client";

// Gerbang akses panel admin. Auth di KRIYA bersifat client-only (supabase-js),
// dan FE dilarang query tabel `profiles` langsung — jadi role admin ditentukan
// lewat API: kita "probe" GET /admin/ping. 200 = admin, 403 = bukan admin.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/kriya/auth-provider";
import { useAdminAccess } from "@/lib/admin-queries";
import { ApiError } from "@/lib/api";
import { useLanguage } from "@/components/kriya/language-provider";

function GuardScreen({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-admin-bg text-admin-muted">
      <Loader2 className="h-6 w-6 animate-spin text-admin-text" />
      <p className="text-[13px]">{label}</p>
    </div>
  );
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const probe = useAdminAccess(!loading && Boolean(user));

  // Belum login → arahkan ke login dengan tujuan kembali ke /admin.
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/admin");
    }
  }, [loading, user, router]);

  // Login tapi bukan admin (atau token ditolak) → tolak & pulangkan ke toko.
  useEffect(() => {
    const err = probe.error;
    if (err instanceof ApiError && (err.code === "forbidden" || err.code === "unauthorized")) {
      toast.error(t("admin.guard.denied"));
      router.replace("/");
    }
  }, [probe.error, router, t]);

  if (loading) return <GuardScreen label={t("admin.guard.session")} />;
  if (!user) return <GuardScreen label={t("admin.guard.toLogin")} />;
  if (probe.isLoading) return <GuardScreen label={t("admin.guard.access")} />;
  if (probe.isError) {
    const err = probe.error;
    const isForbidden = err instanceof ApiError && (err.code === "forbidden" || err.code === "unauthorized");
    if (isForbidden) return <GuardScreen label={t("admin.guard.redirect")} />;
    return <GuardScreen label={t("admin.guard.failed")} />;
  }

  return <>{children}</>;
}
