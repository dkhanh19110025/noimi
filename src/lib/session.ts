// Phiên đăng nhập admin bằng JWT (jose). Dùng được cả trong middleware (edge).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "linhhue_admin";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 ngày

function secretKey(): Uint8Array | null {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) return null;
  return new TextEncoder().encode(s);
}

/** `version` tăng mỗi lần đổi mật khẩu → phiên cũ hết hiệu lực. */
export async function createSessionToken(version: number): Promise<string | null> {
  const key = secretKey();
  if (!key) return null;
  return new SignJWT({ role: "admin", v: version })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key);
}

/** Trả về version trong phiên nếu chữ ký và hạn hợp lệ, ngược lại null. */
export async function verifySession(token: string | undefined): Promise<number | null> {
  if (!token) return null;
  const key = secretKey();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (payload.role !== "admin") return null;
    return typeof payload.v === "number" ? payload.v : 0;
  } catch {
    return null;
  }
}
