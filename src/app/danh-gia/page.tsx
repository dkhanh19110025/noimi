import { redirect } from "next/navigation";

// Đánh giá nay nằm ở từng sản phẩm (chỉ khách đã nhận hàng mới đánh giá được).
export default function ReviewsPage() {
  redirect("/shopping");
}
