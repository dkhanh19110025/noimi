import { NextRequest, NextResponse } from "next/server";
import { combos } from "@/data/combos";
import { isValidDateStr } from "@/data/booking";
import { getSupabase } from "@/lib/supabase-server";
import { getFreeSlots } from "@/lib/availability-db";

export const dynamic = "force-dynamic";

/** GET /api/availability?date=YYYY-MM-DD&combo_id=... → { slots: ["09:00", ...] } */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? "";
  const comboId = req.nextUrl.searchParams.get("combo_id") ?? "";

  const combo = combos.find((c) => c.id === comboId);
  if (!combo || !isValidDateStr(date)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Thiếu hoặc sai ngày / combo." } },
      { status: 400 }
    );
  }

  const db = getSupabase();
  if (!db) {
    return NextResponse.json(
      { error: { code: "NOT_CONFIGURED", message: "Hệ thống chưa kết nối database." } },
      { status: 503 }
    );
  }

  try {
    const slots = await getFreeSlots(db, date, combo.durationMinutes);
    return NextResponse.json(
      { slots },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[GET /api/availability]", (err as Error).message);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Không tải được giờ trống. Vui lòng thử lại." } },
      { status: 500 }
    );
  }
}
