// Tenggat bayar order (payment.expires_at = orders.payment_due_at, tidak pernah
// diperpanjang). BE menolak membuat attempt baru bila sisa waktu < 2 menit
// (checkout/continue_payment.go minPaymentWindow) — FE memakai batas yang sama supaya
// tombol bayar tidak menawarkan sesuatu yang pasti ditolak.
export const MIN_PAYMENT_WINDOW_MS = 2 * 60 * 1000;

export function paymentMsLeft(expiresAt: string | null, now: number): number | null {
  if (!expiresAt) return null;
  const due = Date.parse(expiresAt);
  if (Number.isNaN(due)) return null;
  return due - now;
}

export function isPaymentWindowClosed(expiresAt: string | null, now: number): boolean {
  const left = paymentMsLeft(expiresAt, now);
  return left !== null && left < MIN_PAYMENT_WINDOW_MS;
}

// "23:59:12" / "2 hari 03:10:05" — format hitung mundur tanpa locale-specific API.
export function formatCountdown(ms: number, dayLabel: string): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const clock = [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  return days > 0 ? `${days} ${dayLabel} ${clock}` : clock;
}
