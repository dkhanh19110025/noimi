import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeSlots, vnInstant, type BusyRange } from "@/data/booking";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Các khoảng giờ không nhận lịch trong một ngày: lịch đã đặt (confirmed/arrived) và lịch nghỉ */
export async function getBusyRanges(
  db: SupabaseClient,
  dateStr: string
): Promise<BusyRange[]> {
  const dayStart = vnInstant(dateStr);
  const dayEnd = dayStart + DAY_MS;

  // Lịch đã đặt + lịch nghỉ của chủ shop: hai truy vấn độc lập, chạy song song
  const [bookings, blocks] = await Promise.all([
    db
      .from("bookings")
      .select("starts_at, ends_at")
      .in("status", ["confirmed", "arrived"])
      .lt("starts_at", new Date(dayEnd).toISOString())
      .gt("ends_at", new Date(dayStart).toISOString()),
    db.from("blocked_slots").select("start_min, end_min").eq("day", dateStr),
  ]);

  if (bookings.error) throw bookings.error;
  if (blocks.error) throw blocks.error;

  const busy: BusyRange[] = (bookings.data ?? []).map((r) => ({
    startMs: Date.parse(r.starts_at as string),
    endMs: Date.parse(r.ends_at as string),
  }));
  for (const b of blocks.data ?? []) {
    busy.push({
      startMs: dayStart + (b.start_min as number) * 60000,
      endMs: dayStart + (b.end_min as number) * 60000,
    });
  }
  return busy;
}

export async function getFreeSlots(
  db: SupabaseClient,
  dateStr: string,
  durationMinutes: number
): Promise<string[]> {
  const busy = await getBusyRanges(db, dateStr);
  return computeSlots(dateStr, durationMinutes, busy);
}
