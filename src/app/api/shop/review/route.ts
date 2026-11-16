import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { invalidateCatalog } from "@/lib/catalog";
import { getSupabase } from "@/lib/supabase-server";
import { getCustomerFromRequest } from "@/lib/customer";

export const dynamic = "force-dynamic";

const schema = z.object({
  order_id: z.string().uuid(),
  reviews: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        stars: z.number().int().min(1).max(5),
        content: z.string().trim().max(600).optional().default(""),
      })
    )
    .min(1)
    .max(30),
});

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

/** Khách đánh giá các món trong đơn ĐÃ NHẬN. Mỗi món trong một đơn chỉ đánh giá một lần. */
export async function POST(req: NextRequest) {
  const c = await getCustomerFromRequest(req);
  if (!c) return fail(401, "Bạn cần đăng nhập.");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  const db = getSupabase();
  if (!parsed.success || !db) return fail(400, "Vui lòng chấm sao cho các món bạn muốn đánh giá.");
  const { order_id, reviews } = parsed.data;

  const { data: order } = await db
    .from("shop_orders")
    .select("id, status, customer_id, shop_order_items(product_id)")
    .eq("id", order_id)
    .maybeSingle();
  if (!order || order.customer_id !== c.id) return fail(404, "Không tìm thấy đơn.");
  if (order.status !== "done") return fail(409, "Chỉ đánh giá được sau khi bạn đã nhận hàng.");

  const inOrder = new Set((order.shop_order_items ?? []).map((i) => i.product_id as string | null));
  const rows = reviews
    .filter((r) => inOrder.has(r.product_id))
    .map((r) => ({
      product_id: r.product_id,
      order_id,
      customer_id: c.id,
      customer_name: c.name,
      stars: r.stars,
      content: r.content,
    }));
  if (rows.length === 0) return fail(400, "Sản phẩm không thuộc đơn này.");

  const { error } = await db
    .from("product_reviews")
    .upsert(rows, { onConflict: "order_id,product_id", ignoreDuplicates: true });
  if (error) {
    console.error("[review]", error.message);
    return fail(500, "Không gửi được đánh giá. Vui lòng thử lại.");
  }
  invalidateCatalog();
  return NextResponse.json({ ok: true });
}
