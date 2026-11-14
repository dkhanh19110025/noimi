import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
} from "@/lib/session";
import {
  clearFailures,
  getCredentials,
  isLockedOut,
  recordFailure,
  verifyAdminPassword,
} from "@/lib/admin-password";

export const dynamic = "force-dynamic";

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  if (!process.env.ADMIN_SESSION_SECRET) {
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

  try {
    const cred = await getCredentials(db);
    if (!cred.hash && !process.env.ADMIN_PASSWORD) {
      return fail(503, "NOT_CONFIGURED", "Admin chưa được cấu hình.");
    }

    const ip = clientIp(req);
    if (await isLockedOut(db, ip)) {
      return fail(429, "LOCKED", "Thử quá nhiều lần. Vui lòng đợi 15 phút rồi thử lại.");
    }

    if (!(await verifyAdminPassword(input, cred))) {
      await recordFailure(db, ip);
      // Không tiết lộ đã gần đúng hay chưa.
      return fail(401, "INVALID", "Mật khẩu không đúng.");
    }

    const token = await createSessionToken(cred.version);
    if (!token) return fail(503, "NOT_CONFIGURED", "Admin chưa được cấu hình.");

    await clearFailures(db, ip);

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (err) {
    console.error("[admin login]", (err as Error).message);
    return fail(500, "SERVER_ERROR", "Lỗi hệ thống. Vui lòng thử lại.");
  }
}
