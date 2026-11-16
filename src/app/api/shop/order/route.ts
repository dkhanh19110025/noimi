import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { invalidateCatalog } from "@/lib/catalog";
import { getSupabase } from "@/lib/supabase-server";
import { getCustomerFromRequest } from "@/lib/customer";
import { mailConfigured, sendOrderMail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

const schema = z.object({
  items: z
    .array(z.object({ product_id: z.string().uuid(), qty: z.number().int().min(1).max(99) }))
    .min(1)
    .max(30),
  note: z.string().trim().max(300).optional().default(""),
});

const fail = (status: number, message: string) =>
  NextResponse.json({ ok: false, error: message }, { status });

export async function POST(req: NextRequest) {
  const c = await getCustomerFromRequest(req);
  if (!c) return fail(401, "Bạn cần đăng nhập để đặt hàng.");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "Giỏ hàng không hợp lệ.");
  const db = getSupabase();
  if (!db) return fail(503, "Hệ thống chưa sẵn sàng.");

  const { data, error } = await db.rpc("place_order", {
    p_customer: c.id,
    p_items: parsed.data.items,
    p_note: parsed.data.note,
  });
  if (error) {
    const m = error.message;
    if (m.includes("OUT_OF_STOCK")) {
      const [, name, stock] = m.split("|");
      return fail(409, Number(stock) > 0 ? `"${name}" chỉ còn ${stock} sản phẩm.` : `"${name}" đã hết hàng.`);
    }
    if (m.includes("UNAVAILABLE")) return fail(409, "Có sản phẩm không còn bán. Hãy xóa khỏi giỏ và thử lại.");
    console.error("[order]", m);
    return fail(500, "Không đặt được hàng. Vui lòng thử lại.");
  }

  invalidateCatalog();
  const { id, code, total } = data as { id: string; code: string; total: number };
  // Mail gửi SAU khi đã trả lời khách: đặt hàng không phải chờ SMTP (1-3 giây).
  const note = parsed.data.note;
  after(async () => {
    const { data: items } = await db.from("shop_order_items").select("name, qty, price").eq("order_id", id);
    await sendOrderMail(
      { code, customer_name: c.name, customer_email: c.email, total, note, items: items ?? [] },
      "placed"
    );
  });
  return NextResponse.json({ ok: true, code, total, mailed: mailConfigured() });
}
