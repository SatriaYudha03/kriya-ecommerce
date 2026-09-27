import { MyReviews } from "@/components/kriya/aftersales/my-reviews";

export const metadata = {
  title: "Ulasan Saya | Kriya",
};

export default function AccountReviewsPage() {
  return (
    <div className="space-y-6">
      <MyReviews />
    </div>
  );
}
