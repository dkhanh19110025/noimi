import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { getSupabase } from "@/lib/supabase-server";
import { getCredentials } from "@/lib/admin-password";

/**
 * Phiên hợp lệ khi chữ ký đúng, chưa hết hạn VÀ version trùng với version hiện tại
 * trong database (đổi mật khẩu sẽ tăng version, đăng xuất các máy khác).
 */
export const isAdmin = cache(async (): Promise<boolean> => {
  const jar = await cookies();
  const v = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (v === null) return false;

  const db = getSupabase();
  if (!db) return false;
  try {
    const cred = await getCredentials(db);
    return cred.version === v;
  } catch {
    return false;
  }
});

/** Dùng đầu mỗi trang/hành động admin (bảo vệ thêm một lớp sau middleware). */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
