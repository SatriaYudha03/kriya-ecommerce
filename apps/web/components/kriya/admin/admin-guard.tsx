"use client";

// Gerbang akses panel admin. Auth di KRIYA bersifat client-only (supabase-js),
// dan FE dilarang query tabel `profiles` langsung — jadi role admin ditentukan
// lewat API: kita "probe" GET /admin/stats. 200 = admin, 403 = bukan admin.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/kriya/auth-provider";
import { useAdminStats } from "@/lib/admin-queries";
import { ApiError } from "@/lib/api";

function GuardScreen({ label }: { label: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-neutral-500">
      <Loader2 className="h-6 w-6 animate-spin text-brand-strong" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const probe = useAdminStats(!loading && Boolean(user));

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
      toast.error("Akses ditolak. Halaman ini khusus admin.");
      router.replace("/");
    }
  }, [probe.error, router]);

  if (loading) return <GuardScreen label="Memeriksa sesi…" />;
  if (!user) return <GuardScreen label="Mengalihkan ke halaman masuk…" />;
  if (probe.isLoading) return <GuardScreen label="Memeriksa akses admin…" />;
  if (probe.isError) {
    const err = probe.error;
    const isForbidden = err instanceof ApiError && (err.code === "forbidden" || err.code === "unauthorized");
    if (isForbidden) return <GuardScreen label="Mengalihkan…" />;
    return <GuardScreen label="Gagal memuat panel admin. Silakan coba lagi." />;
  }

  return <>{children}</>;
}
