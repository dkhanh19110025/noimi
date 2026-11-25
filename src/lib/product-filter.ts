export const CATEGORIES = ["Cho mi", "Cho da", "Phụ kiện"] as const;

export const PRICE_RANGES = [
  { id: "low", label: "Dưới 100k", match: (p: number) => p < 100_000 },
  { id: "mid", label: "100k–150k", match: (p: number) => p >= 100_000 && p <= 150_000 },
  { id: "high", label: "Trên 150k", match: (p: number) => p > 150_000 },
];

// shortcut: suy loại từ tên/mô tả; khi sản phẩm nhiều và đoán sai thì thêm cột "category" trong admin.
export function categoryOf(p: { name: string; description: string }): (typeof CATEGORIES)[number] {
  const name = p.name.toLowerCase().normalize("NFC");
  if (/gương|chổi|lược|kẹp|túi|hộp đựng/.test(name)) return "Phụ kiện";
  const all = `${name} ${p.description.toLowerCase().normalize("NFC")}`;
  return /(^|[^\p{L}])mi([^\p{L}]|$)/u.test(all) ? "Cho mi" : "Cho da";
}
