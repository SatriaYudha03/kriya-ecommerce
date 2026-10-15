"use client";

import { useParams } from "next/navigation";
import { CouponEditor } from "@/components/kriya/admin/coupon-form";

// Detail kupon = form edit + riwayat pemakaian (dulu halaman riwayat terpisah).
export default function AdminCouponPage() {
  const { id } = useParams<{ id: string }>();
  return <CouponEditor key={id} couponId={id} />;
}
