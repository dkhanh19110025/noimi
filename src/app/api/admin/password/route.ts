import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  verifySession,
} from "@/lib/session";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  clearFailures,
  getCredentials,
  isLockedOut,
  recordFailure,
  saveNewPassword,
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

/** POST /api/admin/password  { current, next } */
export async function POST(req: NextRequest) {
  const db = getSupabase();
  if (!db) return fail(503, "NOT_CONFIGURED", "Hệ thống chưa kết nối database.");

  let current = "";
  let next = "";
  try {
    const body = await req.json();
    current = typeof body?.current === "string" ? body.current : "";
    next = typeof body?.next === "string" ? body.next : "";
  } catch {
    return fail(400, "BAD_REQUEST", "Dữ liệu không hợp lệ.");
  }

  try {
    // Phiên phải còn hiệu lực (kể cả version sau những lần đổi mật khẩu trước).
    const sessionVersion = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
    const cred = await getCredentials(db);
    if (sessionVersion === null || sessionVersion !== cred.version) {
      return fail(401, "UNAUTHORIZED", "Bạn chưa đăng nhập.");
    }

    const ip = clientIp(req);
    if (await isLockedOut(db, ip)) {
      return fail(429, "LOCKED", "Thử quá nhiều lần. Vui lòng đợi 15 phút rồi thử lại.");
    }

    if (!(await verifyAdminPassword(current, cred))) {
      await recordFailure(db, ip);
      return fail(403, "INVALID_CURRENT", "Mật khẩu hiện tại không đúng.");
    }

    if (next.length < MIN_PASSWORD_LENGTH) {
      return fail(400, "WEAK", `Mật khẩu mới cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`);
    }
    if (next.length > MAX_PASSWORD_LENGTH) {
      return fail(400, "WEAK", `Mật khẩu mới tối đa ${MAX_PASSWORD_LENGTH} ký tự.`);
    }
    if (next === current) {
      return fail(400, "SAME", "Mật khẩu mới phải khác mật khẩu hiện tại.");
    }

    const version = await saveNewPassword(db, next, cred.version);
    await clearFailures(db, ip);

    // Máy này vẫn đăng nhập, các máy khác bị đăng xuất (version đã đổi).
    const token = await createSessionToken(version);
    const res = NextResponse.json({ ok: true });
    if (token) {
      res.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE,
      });
    }
    return res;
  } catch (err) {
    console.error("[admin password]", (err as Error).message);
    return fail(500, "SERVER_ERROR", "Lỗi hệ thống. Vui lòng thử lại.");
  }
}
