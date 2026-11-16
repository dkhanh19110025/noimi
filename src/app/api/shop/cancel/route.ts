import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { invalidateCatalog } from "@/lib/catalog";
import { getSupabase } from "@/lib/supabase-server";
import { getCustomerFromRequest } from "@/lib/customer";
import { sendOrderMail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

const schema = z.object({ id: z.string().uuid() });

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: NextRequest) {
  const c = await getCustomerFromRequest(req);
  if (!c) return fail(401, "Bạn cần đăng nhập.");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  const db = getSupabase();
  if (!parsed.success || !db) return fail(400, "Yêu cầu không hợp lệ.");

  const { data, error } = await db.rpc("cancel_order", {
    p_order: parsed.data.id,
    p_customer: c.id,
    p_by: "customer",
  });
  if (error) return fail(500, "Không hủy được đơn.");
  if (data === "NOT_FOUND") return fail(404, "Không tìm thấy đơn.");
  if (data === "NOT_CANCELLABLE") return fail(409, "Đơn này không thể hủy nữa.");

  invalidateCatalog();
  const orderId = parsed.data.id;
  after(async () => {
    const [o, items] = await Promise.all([
      db.from("shop_orders").select("code, total, note").eq("id", orderId).single(),
      db.from("shop_order_items").select("name, qty, price").eq("order_id", orderId),
    ]);
    if (o.data) {
      await sendOrderMail(
        { code: o.data.code, customer_name: c.name, customer_email: c.email, total: o.data.total, note: o.data.note, items: items.data ?? [] },
        "cancelled"
      );
    }
  });
  return NextResponse.json({ ok: true });
}
