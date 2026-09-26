import { AdminReviews } from "@/components/kriya/aftersales/admin-reviews";

export const metadata = {
  title: "Moderasi Ulasan | Admin Kriya",
};

export default function AdminReviewsPage() {
  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Moderasi Ulasan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tinjau, setujui, tolak, atau balas ulasan dari pelanggan.
        </p>
      </div>
      <AdminReviews />
    </div>
  );
}
