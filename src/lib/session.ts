// Phiên đăng nhập admin bằng JWT (jose). Dùng được cả trong middleware (edge).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "linhhue_admin";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 ngày

function secretKey(): Uint8Array | null {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) return null;
  return new TextEncoder().encode(s);
}

export async function createSessionToken(): Promise<string | null> {
  const key = secretKey();
  if (!key) return null;
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key);
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const key = secretKey();
  if (!key) return false;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return payload.role === "admin";
  } catch {
    return false;
  }
}
