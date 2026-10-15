"use client";

import { AdminGuard } from "@/components/kriya/admin/admin-guard";
import { AdminShell } from "@/components/kriya/admin/admin-shell";

// Guard membungkus seluruh shell: navigasi admin baru tampil setelah akses
// admin terkonfirmasi, bukan bocor ke pengunjung non-admin.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  );
}
