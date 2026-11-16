import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabase } from "@/lib/supabase-server";
import { verifyPassword, isLockedOut, recordFailure, clearFailures } from "@/lib/admin-password";
import {
  CUSTOMER_COOKIE, CUSTOMER_MAX_AGE, PHONE_RE, clientIp, createCustomerToken,
} from "@/lib/customer";

export const dynamic = "force-dynamic";

const schema = z.object({
  phone: z.string().trim().regex(PHONE_RE),
  password: z.string().min(1).max(512),
});

const fail = (status: number, message: string) =>
  NextResponse.json({ ok: false, error: message }, { status });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "Số điện thoại hoặc mật khẩu không đúng.");
  const db = getSupabase();
  if (!db) return fail(503, "Hệ thống chưa sẵn sàng.");

  const ip = "cust:" + clientIp(req);
  if (await isLockedOut(db, ip)) return fail(429, "Thử quá nhiều lần. Vui lòng đợi 15 phút.");

  const { data } = await db
    .from("customers")
    .select("id, name, phone, email, session_version, password_hash")
    .eq("phone", parsed.data.phone)
    .maybeSingle();
  const ok = data ? await verifyPassword(parsed.data.password, data.password_hash) : false;
  if (!data || !ok) {
    await recordFailure(db, ip);
    return fail(401, "Số điện thoại hoặc mật khẩu không đúng.");
  }
  await clearFailures(db, ip);

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
