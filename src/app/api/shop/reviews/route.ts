import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Đánh giá công khai của một sản phẩm (không gồm đánh giá đã ẩn). */
export async function GET(req: NextRequest) {
  const product = req.nextUrl.searchParams.get("product") ?? "";
  const db = getSupabase();
  if (!UUID.test(product) || !db) return NextResponse.json({ reviews: [] });
  const { data } = await db
    .from("product_reviews")
    .select("id, customer_name, stars, content, created_at")
    .eq("product_id", product)
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(30);
  return NextResponse.json(
    { reviews: data ?? [] },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } }
  );
}
