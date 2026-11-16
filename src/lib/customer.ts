import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

export const CUSTOMER_COOKIE = "linhhue_customer";
export const CUSTOMER_MAX_AGE = 60 * 60 * 24 * 30;

export type Customer = { id: string; name: string; phone: string; email: string; session_version?: number };

function key(): Uint8Array | null {
  const s = process.env.ADMIN_SESSION_SECRET;
  return s && s.length >= 32 ? new TextEncoder().encode(s) : null;
}

export async function createCustomerToken(c: Customer): Promise<string | null> {
  const k = key();
  if (!k) return null;
  // Mang sẵn tên/SĐT/email trong phiên để layout không phải hỏi database ở mỗi trang.
  return new SignJWT({ role: "customer", name: c.name, phone: c.phone, email: c.email, v: c.session_version ?? 0 })
    .setSubject(c.id)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CUSTOMER_MAX_AGE}s`)
    .sign(k);
}

type Claims = { id: string; v: number; user: Customer | null };

async function claimsFromToken(token: string | undefined): Promise<Claims | null> {
  const k = key();
  if (!token || !k) return null;
  try {
    const { payload } = await jwtVerify(token, k, { algorithms: ["HS256"] });
    if (payload.role !== "customer" || !payload.sub) return null;
    const { name, phone, email } = payload as Record<string, unknown>;
    const user =
      typeof name === "string" && typeof phone === "string" && typeof email === "string"
        ? { id: payload.sub, name, phone, email }
        : null;
    return { id: payload.sub, v: typeof payload.v === "number" ? payload.v : 0, user };
  } catch {
    return null;
  }
}

/** Đọc khách từ database; phiên hết hiệu lực nếu đã đổi mật khẩu (session_version khác) hoặc tài khoản bị xóa. */
async function load(c: Claims | null, checkVersion = true): Promise<Customer | null> {
  const db = getSupabase();
  if (!c || !db) return null;
  const { data } = await db
    .from("customers")
    .select("id, name, phone, email, session_version")
    .eq("id", c.id)
    .maybeSingle();
  if (!data) return null;
  if (checkVersion && (data.session_version as number) !== c.v) return null;
  return data as Customer;
}

/** Khách đang đăng nhập, đối chiếu database (dùng cho trang cần dữ liệu chính xác). Gộp trùng trong một request. */
export const getCustomer = cache(async (): Promise<Customer | null> => {
  const jar = await cookies();
  return load(await claimsFromToken(jar.get(CUSTOMER_COOKIE)?.value));
});

/** Khách đang đăng nhập chỉ đọc từ phiên đã ký, không chạm database (dùng cho layout). */
export const getSessionUser = cache(async (): Promise<Customer | null> => {
  const jar = await cookies();
  const c = await claimsFromToken(jar.get(CUSTOMER_COOKIE)?.value);
  if (!c) return null;
  return c.user ?? load(c); // phiên cũ chưa có thông tin: hỏi database một lần
});

/** Khách đang đăng nhập (trong route handler). */
export async function getCustomerFromRequest(req: NextRequest): Promise<Customer | null> {
  return load(await claimsFromToken(req.cookies.get(CUSTOMER_COOKIE)?.value));
}

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export const PHONE_RE = /^0[0-9]{9}$/;
