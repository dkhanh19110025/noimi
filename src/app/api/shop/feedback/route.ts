import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabase } from "@/lib/supabase-server";
import { getCustomerFromRequest } from "@/lib/customer";

export const dynamic = "force-dynamic";

const schema = z.object({ content: z.string().trim().min(1).max(1000) });
const MAX_PER_DAY = 5;

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

/** Góp ý riêng gửi tiệm (chỉ admin đọc), cần đăng nhập. */
export async function POST(req: NextRequest) {
  const c = await getCustomerFromRequest(req);
  if (!c) return fail(401, "Bạn cần đăng nhập.");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  const db = getSupabase();
  if (!parsed.success || !db) return fail(400, "Vui lòng nhập nội dung góp ý.");

  const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { count } = await db
    .from("feedback_notes")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", c.id)
    .gt("created_at", since);
  if ((count ?? 0) >= MAX_PER_DAY) return fail(429, "Bạn đã gửi nhiều góp ý hôm nay, vui lòng thử lại sau.");

  const { error } = await db.from("feedback_notes").insert({
    customer_id: c.id,
    name: c.name,
    phone: c.phone,
    content: parsed.data.content,
  });
  if (error) return fail(500, "Không gửi được góp ý. Vui lòng thử lại.");
  return NextResponse.json({ ok: true });
}
