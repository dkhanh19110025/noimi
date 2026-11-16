import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";

/** Sản phẩm đang bán (không ẩn) — dùng cho giỏ hàng và trang yêu thích. */
export async function GET() {
  try {
    const products = await getCatalog();
    if (!products) return NextResponse.json({ products: [] }, { status: 503 });
    return NextResponse.json(
      { products },
      { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" } }
    );
  } catch {
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
