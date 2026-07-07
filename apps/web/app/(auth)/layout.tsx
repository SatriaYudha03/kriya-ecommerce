import Link from "next/link";
import { MoveLeft } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          <MoveLeft className="h-4 w-4" />
          Kembali ke toko
        </Link>
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="mb-8 flex justify-center">
            <Link href="/" className="text-2xl font-semibold tracking-tight text-neutral-900">
              KRIYA
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
