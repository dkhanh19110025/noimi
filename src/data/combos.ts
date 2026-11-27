// Dữ liệu mẫu cho bản demo. Sau này thay bằng bảng `combos` trong Supabase.
export type Combo = {
  id: string;
  name: string;
  /** Câu mở đầu (hiện kèm ✨) */
  tagline: string;
  description: string;
  /** VND. GIÁ TẠM do tạo ngẫu nhiên — chủ tiệm cần sửa lại cho đúng. */
  price: number;
  /** Combo tiết kiệm: tổng giá khi mua lẻ (để hiện số tiền được bớt) */
  originalPrice?: number;
  durationMinutes: number;
  imageUrl: string;
  color: "blue" | "pink" | "green";
};

export const combos: Combo[] = [
  {
    id: "uon-mi",
    name: "Uốn mi",
    tagline: "Đẹp và cuốn hút hơn trong từng ánh nhìn.",
    description: "Đánh thức nét dịu dàng với hàng mi cong tự nhiên.",
    price: 150000,
    durationMinutes: 30,
    imageUrl: "/combos/remix.webp",
    color: "blue",
  },
  {
    id: "noi-mi",
    name: "Nối mi",
    tagline: "Đẹp và cuốn hút hơn trong từng ánh nhìn.",
    description: "Nâng tầm ánh nhìn, tăng thêm sức hút cho đôi mắt.",
    price: 250000,
    durationMinutes: 30,
    imageUrl: "/combos/nhoi.webp",
    color: "pink",
  },
  {
    id: "cham-soc-da",
    name: "Chăm sóc da",
    tagline: "Làn da khỏe là nền tảng của vẻ đẹp rạng rỡ.",
    description: "Nâng niu làn da, nuôi dưỡng vẻ đẹp tự nhiên từ bên trong.",
    price: 200000,
    durationMinutes: 30,
    imageUrl: "/combos/da.webp",
    color: "green",
  },
  // shortcut: sản phẩm tặng kèm không tự trừ kho (chủ tiệm bấm giảm trong admin); bán nhiều thì nối với đơn hàng.
  {
    id: "combo-uon-mi-serum",
    name: "Uốn mi + Serum dưỡng mi",
    tagline: "Combo tiết kiệm: làm đẹp và dưỡng tại nhà.",
    description: "Uốn mi kèm 1 serum dưỡng mi nhận tại tiệm.",
    price: 240000,
    originalPrice: 270000,
    durationMinutes: 30,
    imageUrl: "/combos/lofi.webp",
    color: "blue",
  },
  {
    id: "combo-noi-mi-serum",
    name: "Nối mi + Serum dưỡng mi",
    tagline: "Combo tiết kiệm: mi đẹp lâu hơn.",
    description: "Nối mi kèm 1 serum dưỡng mi nhận tại tiệm.",
    price: 330000,
    originalPrice: 370000,
    durationMinutes: 30,
    imageUrl: "/combos/uonmi.webp",
    color: "pink",
  },
  {
    id: "combo-da-mat-na",
    name: "Chăm sóc da + Mặt nạ cấp nước",
    tagline: "Combo tiết kiệm: da căng mịn cả tuần.",
    description: "Chăm sóc da kèm 1 hộp mặt nạ cấp nước nhận tại tiệm.",
    price: 315000,
    originalPrice: 350000,
    durationMinutes: 30,
    imageUrl: "/combos/noimi.webp",
    color: "green",
  },
];

export function formatPrice(vnd: number): string {
  return new Intl.NumberFormat("vi-VN").format(vnd) + "đ";
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`;
}
