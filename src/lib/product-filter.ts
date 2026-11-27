export const CATEGORIES = ["Mạch", "Cảm biến", "Phụ kiện"] as const;

export const PRICE_RANGES = [
  { id: "low", label: "Dưới 100k", match: (p: number) => p < 100_000 },
  { id: "mid", label: "100k–150k", match: (p: number) => p >= 100_000 && p <= 150_000 },
  { id: "high", label: "Trên 150k", match: (p: number) => p > 150_000 },
];

// shortcut: suy loại từ tên; khi sản phẩm nhiều và đoán sai thì thêm cột "category" trong admin.
export function categoryOf(p: { name: string }): (typeof CATEGORIES)[number] {
  const name = p.name.toLowerCase().normalize("NFC");
  if (name.startsWith("cảm biến")) return "Cảm biến";
  return /^(mạch|màn hình)/.test(name) ? "Mạch" : "Phụ kiện";
}
