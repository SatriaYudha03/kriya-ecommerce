"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MoveLeft, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/kriya/auth-provider";
import { useCartStore } from "@/stores/cart-store";
import { useProfile } from "@/lib/queries";
import { createOrder } from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import { toast } from "sonner";
import Link from "next/link";
import type { ShippingAddress } from "@/lib/types";
import { loadSnap, paySnap } from "@/lib/snap";

const ZONES = {
  jawa_bali: { label: "Jawa & Bali", cost: 150000 },
  luar: { label: "Luar Jawa & Bali", cost: 300000 },
} as const;

type ZoneKey = keyof typeof ZONES;

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { items, total: subtotal, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);

  // Redirect if not logged in or cart empty
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Silakan masuk untuk melanjutkan checkout");
      router.push("/login?next=/checkout");
    } else if (items.length === 0 && !loading) {
      router.push("/cart");
    }
  }, [user, authLoading, items.length, router, loading]);

  const [zone, setZone] = useState<ZoneKey>("jawa_bali");
  const [address, setAddress] = useState<ShippingAddress>({
    recipient: "",
    phone: "",
    address_line: "",
    city: "",
    province: "",
    postal_code: "",
  });

  // Prefill alamat dari profil tersimpan agar user tak mengetik ulang.
  // Seeding dilakukan saat render (guarded sekali) mengikuti pola React 19,
  // bukan di dalam effect.
  const { data: profile } = useProfile(Boolean(user));
  const [prefilled, setPrefilled] = useState(false);
  if (profile && !prefilled) {
    setPrefilled(true);
    const hasSaved =
      profile.full_name ||
      profile.phone ||
      profile.address_line ||
      profile.city ||
      profile.province ||
      profile.postal_code;
    if (hasSaved) {
      setAddress((prev) => {
        const untouched =
          !prev.recipient &&
          !prev.phone &&
          !prev.address_line &&
          !prev.city &&
          !prev.province &&
          !prev.postal_code;
        if (!untouched) return prev;
        return {
          recipient: profile.full_name,
          phone: profile.phone,
          address_line: profile.address_line,
          city: profile.city,
          province: profile.province,
          postal_code: profile.postal_code,
        };
      });
    }
  }

  const total = subtotal + ZONES[zone].cost;
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "SB-Mid-client-XXXXX";

  useEffect(() => {
    loadSnap(clientKey).catch(console.error);
  }, [clientKey]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        items: items.map(i => ({ variant_id: i.variant_id, qty: i.qty })),
        shipping_zone: zone,
        shipping_address: address,
      };

      const res = await createOrder(payload);
      
      if (!res.snap_token) {
        throw new Error("Token pembayaran gagal dibuat");
      }

      // Load snap UI
      const snapResult = await paySnap(res.snap_token);
      
      if (snapResult === "success") {
        await clearCart();
        toast.success("Pembayaran berhasil!");
        router.push(`/orders/${res.order.id}`);
      } else if (snapResult === "pending") {
        await clearCart();
        toast.success("Pesanan dibuat. Menunggu pembayaran.");
        router.push(`/orders/${res.order.id}`);
      } else if (snapResult === "error") {
        toast.error("Pembayaran gagal. Silakan coba lagi.");
        setLoading(false);
      } else if (snapResult === "closed") {
        await clearCart();
        toast.info("Pembayaran ditutup, pesanan tersimpan.");
        router.push(`/orders/${res.order.id}`);
      }

    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat pesanan");
      setLoading(false);
    }
  };

  if (authLoading || (!user && items.length > 0)) {
    return <div className="p-20 text-center">Memuat...</div>;
  }

  if (items.length === 0) {
    return null; // Will redirect
  }

  return (
    <>
      
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <Link href="/cart" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900">
            <MoveLeft className="h-4 w-4" />
            Kembali ke keranjang
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-900">Checkout</h1>
        </div>

        <form onSubmit={handleCheckout} className="grid gap-12 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-7 space-y-8">
            <section>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-medium text-neutral-900">1. Alamat Pengiriman</h2>
                <Link href="/profile" className="text-sm font-medium text-brand hover:text-brand-strong">
                  Kelola alamat tersimpan
                </Link>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700">Nama Penerima</label>
                  <input
                    type="text" required
                    value={address.recipient}
                    onChange={(e) => setAddress({ ...address, recipient: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700">Nomor Telepon</label>
                  <input
                    type="tel" required
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700">Alamat Lengkap</label>
                  <textarea
                    required rows={3}
                    value={address.address_line}
                    onChange={(e) => setAddress({ ...address, address_line: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Kota / Kabupaten</label>
                  <input
                    type="text" required
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Provinsi</label>
                  <input
                    type="text" required
                    value={address.province}
                    onChange={(e) => setAddress({ ...address, province: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700">Kode Pos</label>
                  <input
                    type="text" required
                    value={address.postal_code}
                    onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-medium text-neutral-900">2. Metode Pengiriman</h2>
              <div className="mt-4 space-y-3">
                {(Object.keys(ZONES) as ZoneKey[]).map((key) => (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 ${
                      zone === key ? "border-brand bg-brand/5 ring-1 ring-brand" : "border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shipping_zone"
                        value={key}
                        checked={zone === key}
                        onChange={() => setZone(key)}
                        className="h-4 w-4 border-neutral-300 text-brand focus:ring-brand"
                      />
                      <span className="text-sm font-medium text-neutral-900">{ZONES[key].label}</span>
                    </div>
                    <span className="text-sm font-medium text-neutral-900">
                      {formatRupiah(ZONES[key].cost)}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <div className="lg:col-span-5">
            <div className="sticky top-24 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 lg:p-8">
              <h2 className="text-lg font-medium text-neutral-900">Ringkasan</h2>
              
              <ul className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200">
                {items.map((item) => (
                  <li key={item.variant_id} className="flex py-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                      <Image
                        src={item.product.thumbnail_url}
                        alt={item.product.name}
                        fill
                        className="object-cover object-center"
                        unoptimized={item.product.thumbnail_url.startsWith("http")}
                      />
                    </div>
                    <div className="ml-4 flex flex-1 flex-col justify-center">
                      <div className="flex justify-between text-sm">
                        <div className="font-medium text-neutral-900">{item.product.name}</div>
                        <div className="font-medium text-neutral-900">{formatRupiah(item.subtotal)}</div>
                      </div>
                      <p className="mt-1 text-sm text-neutral-500">
                        {item.product.color} {item.product.size && `· ${item.product.size}`} (x{item.qty})
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <dl className="mt-6 space-y-4 text-sm text-neutral-600">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd className="font-medium text-neutral-900">{formatRupiah(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Pengiriman</dt>
                  <dd className="font-medium text-neutral-900">{formatRupiah(ZONES[zone].cost)}</dd>
                </div>
                <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
                  <dt className="text-base font-medium text-neutral-900">Total belanja</dt>
                  <dd className="text-base font-semibold text-neutral-900">{formatRupiah(total)}</dd>
                </div>
              </dl>

              <button
                type="submit"
                disabled={loading}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-neutral-900 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                {loading ? "Memproses..." : "Bayar Sekarang"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
