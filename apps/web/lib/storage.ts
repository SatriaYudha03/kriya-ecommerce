// Upload gambar produk ke Supabase Storage (bucket 'products') — dipakai HANYA
// di panel admin (pengecualian "FE boleh upload Storage di halaman admin",
// KRIYA-MASTER Bagian 5). Policy tulis admin diatur di migrasi 006.
//
// Mengembalikan storage_path lengkap dengan prefix bucket ("products/<file>"),
// sesuai format yang disimpan DB & dibaca PublicImageURL di backend.

import { supabase } from "./supabase";

const BUCKET = "products";

function fileExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "jpg";
}

export async function uploadProductImage(file: File, slug: string): Promise<string> {
  const safeSlug = (slug || "produk").replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const objectKey = `${safeSlug}-${crypto.randomUUID()}.${fileExt(file.name)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(objectKey, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) {
    throw new Error(`Gagal mengunggah gambar: ${error.message}`);
  }

  return `${BUCKET}/${objectKey}`;
}
