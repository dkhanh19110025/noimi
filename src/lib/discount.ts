// Mã giảm giá và tích điểm. Hàm thuần, dùng được ở server, trình duyệt và file test.
// Phần trăm và tên mã là giá trị tạm, chủ tiệm sửa tại đây.

export const COUPONS = {
  CHAOBAN: { label: "Khách mới", percent: 10, for: "new" },
  QUAYLAI: { label: "Khách quay lại", percent: 5, for: "returning" },
} as const;

/** Đủ `every` lần admin bấm "làm xong" thì lần đặt lịch kế tiếp được giảm */
export const LOYALTY = { every: 5, percent: 20 };

export type History = {
  doneBookings: number;
  /** Lịch đang chờ làm */
  pendingBookings: number;
  /** Đơn hàng chưa hủy */
  orders: number;
  doneOrders: number;
};

export type Discount = { ok: true; percent: number; label: string } | { ok: false; error: string };

/** Chọn MỘT ưu đãi cao nhất giữa mã khách nhập và tích điểm. Mã không hợp lệ thì báo lỗi. */
export function pickDiscount(code: string, h: History, kind: "booking" | "order"): Discount {
  // Có lịch đang chờ thì chưa giảm tiếp, để một mốc tích điểm không dùng được nhiều lần
  const loyal =
    kind === "booking" && h.pendingBookings === 0 && h.doneBookings > 0 && h.doneBookings % LOYALTY.every === 0;
  let best = loyal ? { percent: LOYALTY.percent, label: "Tích điểm" } : { percent: 0, label: "" };

  const key = code.trim().toUpperCase();
  if (key) {
    if (!Object.hasOwn(COUPONS, key)) return { ok: false, error: "Mã giảm giá không đúng." };
    const c = COUPONS[key as keyof typeof COUPONS];
    if (c.for === "new" && h.doneBookings + h.pendingBookings + h.orders > 0) {
      return { ok: false, error: `Mã ${key} chỉ dành cho khách mới.` };
    }
    if (c.for === "returning" && h.doneBookings + h.doneOrders === 0) {
      return { ok: false, error: `Mã ${key} dành cho khách đã từng làm dịch vụ hoặc nhận hàng.` };
    }
    if (c.percent > best.percent) best = { percent: c.percent, label: `Mã ${key}` };
  }
  return { ok: true, ...best };
}

/** Giá sau giảm; số tiền giảm làm tròn tới 1.000đ */
export function applyPercent(price: number, percent: number): number {
  return price - Math.round((price * percent) / 100 / 1000) * 1000;
}
