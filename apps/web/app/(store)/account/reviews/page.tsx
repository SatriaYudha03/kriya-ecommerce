import { MyReviews } from "@/components/kriya/aftersales/my-reviews";

export const metadata = {
  title: "Ulasan Saya | Kriya",
};

export default function AccountReviewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ulasan Saya</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Berikan ulasan untuk produk yang telah Anda beli.
        </p>
      </div>
      <MyReviews />
    </div>
  );
}
