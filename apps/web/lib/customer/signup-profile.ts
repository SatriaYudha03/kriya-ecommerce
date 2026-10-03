import type { User } from "@supabase/supabase-js";
import { getProfile, updateProfile } from "./api";

function metaString(user: User, key: string): string {
  const value: unknown = user.user_metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}

// Salin nama & telepon dari user_metadata (diisi saat daftar, atau nama dari
// Google) ke profil, hanya untuk kolom profil yang masih kosong — jadi aman
// dipanggil di setiap login. PUT /profile bersifat replace, maka profil lama
// digabung dulu. Gagal di sini tidak boleh menggagalkan login.
export async function applySignupProfile(user: User): Promise<void> {
  const fullName = metaString(user, "full_name");
  const phone = metaString(user, "phone");
  if (!fullName && !phone) return;

  try {
    const profile = await getProfile();
    const next = {
      ...profile,
      full_name: profile.full_name || fullName,
      phone: profile.phone || phone,
    };
    if (next.full_name === profile.full_name && next.phone === profile.phone) return;
    await updateProfile(next);
  } catch {
    // Profil bisa dilengkapi manual di /profile.
  }
}
