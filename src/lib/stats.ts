export type Sale = { name: string; qty: number; revenue: number };

/** Gộp theo tên, bán nhiều nhất lên đầu */
export function topSales(rows: Sale[]): Sale[] {
  const map = new Map<string, Sale>();
  for (const r of rows) {
    const s = map.get(r.name) ?? { name: r.name, qty: 0, revenue: 0 };
    s.qty += r.qty;
    s.revenue += r.revenue;
    map.set(r.name, s);
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue);
}
