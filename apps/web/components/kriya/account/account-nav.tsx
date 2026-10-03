import Link from "next/link";
export interface AccountNavProps { active: "profile" | "orders" | "addresses" | "reviews" | "returns" | "notifications"; }
export function AccountNav({ active }: AccountNavProps) {
  return (
    <nav className="flex flex-col space-y-1">
      <Link href="/profile" className={`px-3 py-2 rounded-md ${active === "profile" ? "bg-neutral-100 font-medium" : "text-neutral-600 hover:bg-neutral-50"}`}>Profil</Link>
      <Link href="/account/addresses" className={`px-3 py-2 rounded-md ${active === "addresses" ? "bg-neutral-100 font-medium" : "text-neutral-600 hover:bg-neutral-50"}`}>Alamat</Link>
      <Link href="/orders" className={`px-3 py-2 rounded-md ${active === "orders" ? "bg-neutral-100 font-medium" : "text-neutral-600 hover:bg-neutral-50"}`}>Pesanan Saya</Link>
      <Link href="/account/reviews" className={`px-3 py-2 rounded-md ${active === "reviews" ? "bg-neutral-100 font-medium" : "text-neutral-600 hover:bg-neutral-50"}`}>Ulasan Saya</Link>
      <Link href="/account/returns" className={`px-3 py-2 rounded-md ${active === "returns" ? "bg-neutral-100 font-medium" : "text-neutral-600 hover:bg-neutral-50"}`}>Pengembalian</Link>
      <Link href="/account/notifications" className={`px-3 py-2 rounded-md ${active === "notifications" ? "bg-neutral-100 font-medium" : "text-neutral-600 hover:bg-neutral-50"}`}>Notifikasi</Link>
    </nav>
  );
}
