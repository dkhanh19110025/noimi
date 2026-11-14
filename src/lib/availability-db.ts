import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeSlots, vnInstant, type BusyRange } from "@/data/booking";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Lấy các khoảng giờ đã có lịch (confirmed/arrived) trong một ngày */
export async function getBusyRanges(
  db: SupabaseClient,
  dateStr: string
): Promise<BusyRange[]> {
  const dayStart = vnInstant(dateStr);
  const dayEnd = dayStart + DAY_MS;

  const { data, error } = await db
    .from("bookings")
    .select("starts_at, ends_at")
    .in("status", ["confirmed", "arrived"])
    .lt("starts_at", new Date(dayEnd).toISOString())
    .gt("ends_at", new Date(dayStart).toISOString());

  if (error) throw error;

  return (data ?? []).map((r) => ({
    startMs: Date.parse(r.starts_at as string),
    endMs: Date.parse(r.ends_at as string),
  }));
}

export async function getFreeSlots(
  db: SupabaseClient,
  dateStr: string,
  durationMinutes: number
): Promise<string[]> {
  const busy = await getBusyRanges(db, dateStr);
  return computeSlots(dateStr, durationMinutes, busy);
}
