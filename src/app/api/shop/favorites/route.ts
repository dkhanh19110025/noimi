import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabase } from "@/lib/supabase-server";
import { getCustomerFromRequest } from "@/lib/customer";

export const dynamic = "force-dynamic";

const schema = z.object({
  add: z.array(z.string().uuid()).max(100).optional().default([]),
  remove: z.array(z.string().uuid()).max(100).optional().default([]),
});

export async function GET(req: NextRequest) {
  const c = await getCustomerFromRequest(req);
  const db = getSupabase();
  if (!c || !db) return NextResponse.json({ ids: [] });
  const { data } = await db.from("favorites").select("product_id").eq("customer_id", c.id);
  return NextResponse.json({ ids: (data ?? []).map((r) => r.product_id) });
}

export async function POST(req: NextRequest) {
  const c = await getCustomerFromRequest(req);
  const db = getSupabase();
  if (!c || !db) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const { add, remove } = parsed.data;

  if (add.length) {
    // Chỉ thêm sản phẩm còn tồn tại
    const { data: ok } = await db.from("products").select("id").in("id", add);
    const rows = (ok ?? []).map((p) => ({ customer_id: c.id, product_id: p.id }));
    if (rows.length) {
      await db.from("favorites").upsert(rows, { onConflict: "customer_id,product_id", ignoreDuplicates: true });
    }
  }
  if (remove.length) {
    await db.from("favorites").delete().eq("customer_id", c.id).in("product_id", remove);
  }

  const { data } = await db.from("favorites").select("product_id").eq("customer_id", c.id);
  return NextResponse.json({ ok: true, ids: (data ?? []).map((r) => r.product_id) });
}
