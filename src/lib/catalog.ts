import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { getSupabase } from "@/lib/supabase-server";

export const CATALOG_TAG = "catalog";

export type CatalogProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  color: string;
  image_url: string | null;
  stock: number;
  avg_stars: number | null;
  review_count: number;
};

/**
 * Danh sách sản phẩm đang bán kèm sao trung bình, dùng chung cho trang /shopping và API.
 * Lưu đệm 60 giây và bị xóa ngay (invalidateCatalog) khi có đơn, hủy đơn, đánh giá
 * hoặc admin sửa sản phẩm — nên nhiều khách xem cùng lúc chỉ tốn một lượt truy vấn.
 * Số lượng đặt hàng luôn được kiểm tra lại trong database, không dựa vào bản đệm này.
 */
export const getCatalog = unstable_cache(
  async (): Promise<CatalogProduct[] | null> => {
    const db = getSupabase();
    if (!db) return null;
    // Hai truy vấn độc lập: chạy song song
    const [products, ratings] = await Promise.all([
      db
        .from("products")
        .select("id, name, description, price, icon, color, image_url, stock")
        .eq("hidden", false)
        .order("sort_order")
        .order("created_at"),
      db.from("product_ratings").select("product_id, avg_stars, review_count"),
    ]);
    if (products.error) throw products.error;
    const map = new Map((ratings.data ?? []).map((r) => [r.product_id as string, r]));
    return (products.data ?? []).map((p) => {
      const r = map.get(p.id as string);
      return {
        ...(p as Omit<CatalogProduct, "avg_stars" | "review_count">),
        avg_stars: r ? (r.avg_stars as number) : null,
        review_count: r ? (r.review_count as number) : 0,
      };
    });
  },
  ["catalog-v1"],
  { revalidate: 60, tags: [CATALOG_TAG] }
);

export function invalidateCatalog() {
  revalidateTag(CATALOG_TAG);
}
