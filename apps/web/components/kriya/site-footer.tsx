// Footer toko sederhana, Bahasa Indonesia.
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-neutral-200 bg-[#faf7f2]">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-neutral-500">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base font-semibold text-neutral-900">KRIYA</p>
          <p>Furniture flat-pack buatan sendiri. Data demo — pembayaran sandbox.</p>
        </div>
        <p className="mt-6 text-neutral-400">© 2026 KRIYA. Seluruh data sintetis.</p>
      </div>
    </footer>
  );
}
