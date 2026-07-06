import Link from "next/link";

// 404 global (di luar grup toko, tanpa header/footer).
export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-cream px-4 text-center">
      <p className="text-sm font-medium tracking-widest text-brand uppercase">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-2 max-w-sm text-sm text-neutral-500">
        Tautan mungkin salah atau produk sudah tidak tersedia.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Kembali ke beranda
      </Link>
    </div>
  );
}
