// Dữ liệu mẫu cho bản demo. Sau này thay bằng bảng `combos` trong Supabase.
export type Combo = {
  id: string;
  name: string;
  /** Câu mở đầu (hiện kèm ✨) */
  tagline: string;
  description: string;
  /** VND. Hiện chưa chốt giá nên = 0 và KHÔNG hiển thị cho khách; khi có giá chỉ cần điền vào đây. */
  price: number;
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
    price: 0,
    durationMinutes: 30,
    imageUrl: "/combos/uonmi.webp",
    color: "blue",
  },
  {
    id: "noi-mi",
    name: "Nối mi",
    tagline: "Đẹp và cuốn hút hơn trong từng ánh nhìn.",
    description: "Nâng tầm ánh nhìn, tăng thêm sức hút cho đôi mắt.",
    price: 0,
    durationMinutes: 30,
    imageUrl: "/combos/noimi.webp",
    color: "pink",
  },
  {
    id: "cham-soc-da",
    name: "Chăm sóc da",
    tagline: "Làn da khỏe là nền tảng của vẻ đẹp rạng rỡ.",
    description: "Nâng niu làn da, nuôi dưỡng vẻ đẹp tự nhiên từ bên trong.",
    price: 0,
    durationMinutes: 30,
    imageUrl: "/combos/da.webp",
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
