// Dữ liệu mẫu cho bản demo. Sau này thay bằng bảng `combos` trong Supabase.
export type Combo = {
  id: string;
  name: string;
  description: string;
  price: number; // VND
  durationMinutes: number;
  imageUrl: string;
  color: "blue" | "pink" | "green";
};

export const combos: Combo[] = [
  {
    id: "tu-nhien",
    name: "Nối mi tự nhiên",
    description: "Mi nhẹ, mỏng, nhìn như mi thật. Hợp đi làm, đi học.",
    price: 150000,
    durationMinutes: 60,
    imageUrl: "/combos/tu-nhien.svg",
    color: "blue",
  },
  {
    id: "volume",
    name: "Nối mi volume",
    description: "Mi dày, cong vút, ánh nhìn có chiều sâu. Hợp đi tiệc.",
    price: 250000,
    durationMinutes: 90,
    imageUrl: "/combos/volume.svg",
    color: "pink",
  },
  {
    id: "hybrid",
    name: "Nối mi hybrid",
    description: "Pha giữa tự nhiên và volume. Dày vừa, không bị nặng mắt.",
    price: 200000,
    durationMinutes: 75,
    imageUrl: "/combos/hybrid.svg",
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
