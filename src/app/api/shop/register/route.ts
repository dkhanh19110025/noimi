import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabase } from "@/lib/supabase-server";
import { hashPassword } from "@/lib/admin-password";
import {
  CUSTOMER_COOKIE, CUSTOMER_MAX_AGE, PHONE_RE, clientIp, createCustomerToken,
} from "@/lib/customer";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).max(60),
  phone: z.string().trim().regex(PHONE_RE),
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(6).max(128),
});

const fail = (status: number, message: string) =>
  NextResponse.json({ ok: false, error: message }, { status });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail(400, "Vui lòng điền đủ: tên, SĐT 10 số, email đúng và mật khẩu từ 6 ký tự.");
  }
  const db = getSupabase();
  if (!db) return fail(503, "Hệ thống chưa sẵn sàng.");

  // Chống tạo hàng loạt tài khoản: tối đa 5 lần / giờ / IP
  const ip = "reg:" + clientIp(req);
  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const { count } = await db
    .from("admin_login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gt("attempted_at", since);
  if ((count ?? 0) >= 5) return fail(429, "Bạn đăng ký quá nhiều lần, vui lòng thử lại sau.");

  const { name, phone, email, password } = parsed.data;
  const { data, error } = await db
    .from("customers")
    .insert({ name, phone, email, password_hash: await hashPassword(password) })
    .select("id, name, phone, email, session_version")
    .single();
  if (error) {
    if (error.code === "23505") return fail(409, "Số điện thoại này đã có tài khoản. Hãy đăng nhập.");
    console.error("[register]", error.message);
    return fail(500, "Lỗi hệ thống. Vui lòng thử lại.");
  }
  await db.from("admin_login_attempts").insert({ ip });

  const token = await createCustomerToken(data);
  if (!token) return fail(503, "Hệ thống chưa được cấu hình.");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CUSTOMER_MAX_AGE,
  });
  return res;
}
