// Định dạng ngày giờ theo múi giờ Việt Nam (dùng được cả server và trình duyệt).
const TZ = "Asia/Ho_Chi_Minh";

export function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** dd/MM/yyyy */
export function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

/** "Thứ Hai, 17/11/2026" cho một chuỗi YYYY-MM-DD */
export function fmtDayLong(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00+07:00`);
  const wd = new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, weekday: "long" }).format(d);
  const rest = new Intl.DateTimeFormat("vi-VN", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)}, ${rest}`;
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00+07:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

export const STATUS_LABEL: Record<string, string> = {
  confirmed: "Đã xác nhận",
  arrived: "Đã đến",
  cancelled: "Đã hủy",
  no_show: "Không đến",
};

export const STATUS_PILL: Record<string, string> = {
  confirmed: "pill--blue",
  arrived: "pill--green",
  cancelled: "pill--pink",
  no_show: "pill--orange",
};

export const STATUS_ICON: Record<string, string> = {
  confirmed: "🗓️",
  arrived: "✅",
  cancelled: "❌",
  no_show: "👻",
};
