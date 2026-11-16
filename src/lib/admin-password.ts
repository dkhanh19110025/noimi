import "server-only";
import { scrypt, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import type { SupabaseClient } from "@supabase/supabase-js";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 128;

export type Credentials = {
  hash: string | null; // null = chưa đổi mật khẩu lần nào (dùng ADMIN_PASSWORD)
  version: number;
};

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt1$${salt.toString("hex")}$${key.toString("hex")}`;
}

async function verifyHash(password: string, stored: string): Promise<boolean> {
  const [tag, saltHex, keyHex] = stored.split("$");
  if (tag !== "scrypt1" || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Kiểm tra mật khẩu với chuỗi băm đã lưu (dùng cho tài khoản khách). */
export const verifyPassword = verifyHash;

/** So sánh thời gian cố định (băm trước để hai chuỗi luôn cùng độ dài). */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function getCredentials(db: SupabaseClient): Promise<Credentials> {
  const { data, error } = await db
    .from("admin_credentials")
    .select("password_hash, session_version")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return data
    ? { hash: data.password_hash as string, version: data.session_version as number }
    : { hash: null, version: 0 };
}

/**
 * Đã có mật khẩu trong database thì chỉ mật khẩu đó có hiệu lực.
 * Chưa có thì dùng ADMIN_PASSWORD trong biến môi trường.
 */
export async function verifyAdminPassword(
  input: string,
  cred: Credentials
): Promise<boolean> {
  if (!input || input.length > MAX_PASSWORD_LENGTH * 4) return false;
  if (cred.hash) return verifyHash(input, cred.hash);
  const envPassword = process.env.ADMIN_PASSWORD;
  return !!envPassword && safeEqual(input, envPassword);
}

/** Đặt mật khẩu mới và tăng version để đăng xuất các máy khác. Trả về version mới. */
export async function saveNewPassword(
  db: SupabaseClient,
  newPassword: string,
  currentVersion: number
): Promise<number> {
  const version = currentVersion + 1;
  const { error } = await db.from("admin_credentials").upsert({
    id: 1,
    password_hash: await hashPassword(newPassword),
    session_version: version,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  return version;
}

/* ───── chống đoán mật khẩu: quá 5 lần sai / 15 phút / IP ───── */
const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function isLockedOut(db: SupabaseClient, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count } = await db
    .from("admin_login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gt("attempted_at", since);
  return (count ?? 0) >= MAX_FAILS;
}

export async function recordFailure(db: SupabaseClient, ip: string) {
  await db.from("admin_login_attempts").insert({ ip });
}

export async function clearFailures(db: SupabaseClient, ip: string) {
  await db.from("admin_login_attempts").delete().eq("ip", ip);
}
