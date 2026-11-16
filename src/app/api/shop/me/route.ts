import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/customer";

export const dynamic = "force-dynamic";

/** Khách đang đăng nhập (đọc từ phiên đã ký). Trang tĩnh gọi API này sau khi tải xong. */
export async function GET() {
  const u = await getSessionUser();
  return NextResponse.json(
    { user: u ? { id: u.id, name: u.name, phone: u.phone, email: u.email } : null },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
