"use client";

import { useState } from "react";
import { Check, Mail } from "lucide-react";

// Form berlangganan (demo — tanpa jaringan). Konfirmasi inline setelah submit.
export function Newsletter() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-brand-tint px-4 py-3 text-sm text-brand-strong">
        <Check className="h-4 w-4" />
        Terima kasih — kabar terbaru akan dikirim ke {email}.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Alamat email"
          aria-label="Alamat email"
          className="w-full rounded-full border border-neutral-300 bg-white py-2.5 pr-4 pl-9 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={!valid}
        className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Langganan
      </button>
    </form>
  );
}
