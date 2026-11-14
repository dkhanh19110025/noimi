import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/**
 * Chặn mọi /admin/* và /api/admin/* nếu chưa có phiên đăng nhập hợp lệ (trừ trang và API đăng nhập).
 * Middleware chỉ kiểm tra chữ ký và hạn; việc đối chiếu version (sau khi đổi mật khẩu)
 * do requireAdmin() và các API admin làm phía server.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const v = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (v !== null) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Bạn chưa đăng nhập." } },
      { status: 401 }
    );
  }
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
