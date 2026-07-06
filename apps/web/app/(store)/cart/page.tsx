import Link from "next/link";
import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";

export const metadata: Metadata = { title: "Keranjang — KRIYA" };

// Placeholder M1: keranjang & checkout dibangun di M2 (Zustand + PUT /api/v1/cart).
export default function CartPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint text-brand-strong">
        <ShoppingBag className="h-6 w-6" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-neutral-900">Keranjang</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-neutral-500">
        Keranjang dan checkout (termasuk pembayaran Midtrans sandbox) aktif pada M2. Untuk sekarang,
        jelajahi katalog dan lihat detail produk.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Lanjut belanja
      </Link>
    </div>
  );
}
