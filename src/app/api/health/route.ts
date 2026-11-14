import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron gọi mỗi ngày để database Supabase (gói miễn phí) không bị tạm dừng
 * khi lâu không có khách đặt lịch. Không trả về dữ liệu nào của khách.
 */
export async function GET() {
  const db = getSupabase();
  if (!db) return NextResponse.json({ ok: false }, { status: 503 });

  const { error } = await db
    .from("bookings")
    .select("id", { count: "exact", head: true });

  return NextResponse.json({ ok: !error }, { status: error ? 500 : 200 });
}
