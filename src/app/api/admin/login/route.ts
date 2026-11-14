import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "node:crypto";
import { getSupabase } from "@/lib/supabase-server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
} from "@/lib/session";

export const dynamic = "force-dynamic";

const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** So sánh thời gian cố định (băm trước để hai chuỗi luôn cùng độ dài). */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !process.env.ADMIN_SESSION_SECRET) {
    return fail(503, "NOT_CONFIGURED", "Admin chưa được cấu hình.");
  }
  const db = getSupabase();
  if (!db) return fail(503, "NOT_CONFIGURED", "Hệ thống chưa kết nối database.");

  let input = "";
  try {
    const body = await req.json();
    input = typeof body?.password === "string" ? body.password : "";
  } catch {
    return fail(400, "BAD_REQUEST", "Dữ liệu không hợp lệ.");
  }

  const ip = clientIp(req);
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  // Quá 5 lần sai trong 15 phút từ cùng một IP thì từ chối tạm.
  const { count } = await db
    .from("admin_login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gt("attempted_at", since);
  if ((count ?? 0) >= MAX_FAILS) {
    return fail(429, "LOCKED", "Thử quá nhiều lần. Vui lòng đợi 15 phút rồi thử lại.");
  }

  if (!input || !safeEqual(input, password)) {
    await db.from("admin_login_attempts").insert({ ip });
    // Không tiết lộ đã gần đúng hay chưa.
    return fail(401, "INVALID", "Mật khẩu không đúng.");
  }

  const token = await createSessionToken();
  if (!token) return fail(503, "NOT_CONFIGURED", "Admin chưa được cấu hình.");

  await db.from("admin_login_attempts").delete().eq("ip", ip);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
