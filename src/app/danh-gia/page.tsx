import ReviewsView, { type PublicReview } from "@/components/ReviewsView";
import { getSupabase } from "@/lib/supabase-server";

// Làm mới tối đa 5 phút/lần; khi chủ tiệm duyệt hoặc ẩn đánh giá thì trang cũng được làm mới ngay.
export const revalidate = 300;

export default async function ReviewsPage() {
  let reviews: PublicReview[] = [];
  const db = getSupabase();
  if (db) {
    const { data } = await db
      .from("reviews")
      .select("id, name, stars, content, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(60);
    reviews = (data ?? []) as PublicReview[];
  }

  return (
    <main className="container section">
      <span className="badge-tilt">Đánh giá</span>
      <h1 style={{ marginTop: 24 }}>Khách nói gì</h1>
      <p className="subtitle">— lời thật từ khách của tiệm</p>
      <ReviewsView reviews={reviews} />
    </main>
  );
}
