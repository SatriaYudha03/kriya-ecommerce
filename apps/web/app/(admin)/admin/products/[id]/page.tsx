"use client";

import { useParams } from "next/navigation";
import { ProductEditor } from "@/components/kriya/admin/product-form";

export default function AdminEditProductPage() {
  const { id } = useParams<{ id: string }>();
  // key: ganti produk = state editor baru (seed ulang dari detail produk itu).
  return <ProductEditor key={id} productId={id} />;
}
