import { Truck } from "lucide-react";

// Bar pengumuman tipis di atas header (gaya anon). Non-sticky.
export function TopBar() {
  return (
    <div className="bg-clay text-cream">
      <div className="mx-auto flex h-9 max-w-6xl items-center justify-center gap-2 px-4 text-xs">
        <Truck className="h-3.5 w-3.5" />
        <span>
          Gratis ongkir Jawa–Bali untuk pesanan pertama · Data demo, pembayaran sandbox
        </span>
      </div>
    </div>
  );
}
