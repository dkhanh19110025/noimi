// Cấu hình và logic tính giờ trống. Dùng được cả ở server lẫn trình duyệt.
// Mọi giờ đều hiểu theo giờ Việt Nam (UTC+7, không có giờ mùa hè).

/** Ba buổi nhận lịch (phút tính từ 0h). Dịch vụ phải bắt đầu và kết thúc trong cùng một buổi. */
export type Session = {
  id: "morning" | "afternoon" | "evening";
  label: string;
  icon: string;
  startMin: number;
  endMin: number;
  /** Chuỗi giờ hiển thị cho khách */
  range: string;
};
export const SESSIONS: Session[] = [
  { id: "morning", label: "Buổi sáng", icon: "🌅", startMin: 7 * 60, endMin: 11 * 60 + 30, range: "7:00 – 11:30" },
  { id: "afternoon", label: "Buổi chiều", icon: "🌤️", startMin: 12 * 60, endMin: 17 * 60 + 30, range: "12:00 – 17:30" },
  { id: "evening", label: "Buổi tối", icon: "🌙", startMin: 18 * 60, endMin: 24 * 60, range: "18:00 – 0:00" },
];

/** Buổi chứa một giờ bắt đầu "HH:mm" */
export function sessionOf(time: string): Session | undefined {
  const [h, m] = time.split(":").map(Number);
  const t = h * 60 + m;
  return SESSIONS.find((s) => t >= s.startMin && t < s.endMin);
}
/** Khoảng cách giữa các giờ bắt đầu (phút) */
export const SLOT_INTERVAL = 120;

/** Đặt trước tối đa bao nhiêu ngày */
export const MAX_DAYS_AHEAD = 7;
/** Phải đặt trước ít nhất bao nhiêu giờ */
export const MIN_HOURS_AHEAD = 3;
/** Số lịch đang chờ tối đa cho mỗi SĐT */
export const MAX_PENDING_PER_PHONE = 3;

/** Ngày nghỉ (YYYY-MM-DD). Sau này chuyển vào database. */
export const HOLIDAYS: string[] = [
  "2026-01-01",
  "2026-01-26",
  "2026-01-27",
  "2026-01-28",
  "2026-01-29",
  "2026-01-30",
  "2026-04-30",
  "2026-05-01",
  "2026-09-02",
];

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Chuỗi ngày YYYY-MM-DD của một thời điểm, theo giờ Việt Nam */
export function vnDateStr(ms: number): string {
  return new Date(ms + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/** Thời điểm (ms) của "YYYY-MM-DD" + "HH:mm" theo giờ Việt Nam */
export function vnInstant(dateStr: string, time = "00:00"): number {
  return Date.parse(`${dateStr}T${time}:00+07:00`);
}

/** Chuỗi ISO có múi giờ +07:00, dùng khi gửi vào database */
export function vnIso(dateStr: string, time: string): string {
  return `${dateStr}T${time}:00+07:00`;
}

export function isValidDateStr(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(vnInstant(s));
}

/** Khoảng đã bận, tính bằng mili-giây (epoch) */
export type BusyRange = { startMs: number; endMs: number };

/**
 * Tính các giờ bắt đầu còn trống của một ngày.
 * - Bỏ ngày nghỉ, ngày đã qua, ngày quá MAX_DAYS_AHEAD
 * - Bỏ giờ chưa đủ MIN_HOURS_AHEAD
 * - Bỏ giờ làm dịch vụ không kết thúc trong cùng buổi (sáng / chiều / tối)
 * - Bỏ giờ chồng lên lịch đã có
 */
export function computeSlots(
  dateStr: string,
  durationMinutes: number,
  busy: BusyRange[],
  nowMs: number = Date.now()
): string[] {
  if (!isValidDateStr(dateStr) || durationMinutes <= 0) return [];
  if (isHoliday(dateStr)) return [];

  const today = vnDateStr(nowMs);
  const daysAhead = Math.round(
    (vnInstant(dateStr) - vnInstant(today)) / DAY_MS
  );
  if (daysAhead < 0 || daysAhead >= MAX_DAYS_AHEAD) return [];

  const earliest = nowMs + MIN_HOURS_AHEAD * 60 * 60 * 1000;
  const dayStartMs = vnInstant(dateStr);
  const out: string[] = [];

  for (const ses of SESSIONS) {
    for (let t = ses.startMin; t + durationMinutes <= ses.endMin; t += SLOT_INTERVAL) {
      const startMs = dayStartMs + t * 60 * 1000;
      const endMs = startMs + durationMinutes * 60 * 1000;

      if (startMs < earliest) continue;
      if (busy.some((b) => startMs < b.endMs && endMs > b.startMs)) continue;

      out.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
    }
  }
  return out;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Kiểm tra ngày có phải ngày nghỉ không */
export function isHoliday(dateStr: string): boolean {
  return HOLIDAYS.includes(dateStr);
}

/** Format ngày thành chuỗi YYYY-MM-DD (theo giờ máy, dùng để vẽ lịch chọn ngày) */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Tên thứ tiếng Việt */
const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
export function dayName(d: Date): string {
  return DAY_NAMES[d.getDay()];
}
