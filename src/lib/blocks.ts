import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SESSIONS, isValidDateStr, vnDateStr, vnInstant } from "@/data/booking";

export type BlockInput = {
  day: string;
  startMin: number;
  endMin: number;
  reason: string;
  type: string;
};

export type AffectedBooking = {
  id: string;
  customer_name: string;
  customer_phone: string;
  combo_name: string;
  starts_at: string;
  ends_at: string;
};

const TYPES = ["day", "morning", "afternoon", "evening", "range"];

/** Phút → "H:mm" (1440 hiển thị là 0:00 của ngày hôm sau) */
export function minToLabel(min: number): string {
  const m = min % 1440;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

/** Tên dễ đọc của một khung nghỉ: Cả ngày / Buổi sáng / 9:00 – 11:00 */
export function blockLabel(startMin: number, endMin: number): string {
  if (startMin === 0 && endMin === 1440) return "Cả ngày";
  const ses = SESSIONS.find((s) => s.startMin === startMin && s.endMin === endMin);
  if (ses) return ses.label;
  return `${minToLabel(startMin)} – ${minToLabel(endMin)}`;
}

/** Đọc và kiểm tra dữ liệu form (hoặc query) → khung nghỉ hợp lệ hoặc null */
export function parseBlockInput(raw: Record<string, string | undefined>): BlockInput | null {
  const day = raw.day ?? "";
  const type = raw.type ?? "";
  if (!isValidDateStr(day) || day < vnDateStr(Date.now())) return null;
  if (!TYPES.includes(type)) return null;

  let startMin = 0;
  let endMin = 1440;
  if (type === "range") {
    startMin = Number(raw.from);
    endMin = Number(raw.to);
    if (!Number.isInteger(startMin) || !Number.isInteger(endMin)) return null;
    if (startMin < 0 || endMin > 1440 || endMin <= startMin) return null;
  } else if (type !== "day") {
    const ses = SESSIONS.find((s) => s.id === type)!;
    startMin = ses.startMin;
    endMin = ses.endMin;
  }
  return { day, type, startMin, endMin, reason: (raw.reason ?? "").trim().slice(0, 200) };
}

/** Các lịch đang hiệu lực đã đặt trong khung này */
export async function findAffected(
  db: SupabaseClient,
  day: string,
  startMin: number,
  endMin: number
): Promise<AffectedBooking[]> {
  const base = vnInstant(day);
  const { data } = await db
    .from("bookings")
    .select("id, customer_name, customer_phone, combo_name, starts_at, ends_at")
    .in("status", ["confirmed", "arrived"])
    .lt("starts_at", new Date(base + endMin * 60000).toISOString())
    .gt("ends_at", new Date(base + startMin * 60000).toISOString())
    .order("starts_at", { ascending: true });
  return (data ?? []) as AffectedBooking[];
}
