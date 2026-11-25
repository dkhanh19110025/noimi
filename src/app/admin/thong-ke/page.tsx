import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase-server";
import { vnDateStr, vnIso } from "@/data/booking";
import { formatPrice } from "@/data/combos";
import { topSales, type Sale } from "@/lib/stats";

export const dynamic = "force-dynamic";

const PAGE = 1000;

/** Supabase trả tối đa 1000 dòng một lần: đọc lần lượt cho đủ */
async function readAll<T>(query: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    all.push(...rows);
    if (rows.length < PAGE) return all;
  }
}

type Booking = { combo_name: string; price: number };
type Order = { total: number; shop_order_items: { name: string; qty: number; price: number }[] };

const PERIODS = [
  { id: "thang", label: "Tháng này" },
  { id: "tat-ca", label: "Tất cả" },
];

function Ranking({ title, unit, rows }: { title: string; unit: string; rows: Sale[] }) {
  return (
    <section className="card" style={{ marginTop: 24 }}>
      <h2>{title}</h2>
      {rows.length === 0 && <p className="muted" style={{ marginTop: 8 }}>Chưa có dữ liệu.</p>}
      <ol className="stat-list">
        {rows.slice(0, 10).map((r) => (
          <li key={r.name}>
            <div className="summary-row">
              <strong>{r.name}</strong>
              <span>{r.qty} {unit}</span>
            </div>
            <div className="stat-bar" aria-hidden="true">
              <span style={{ width: `${(r.qty / rows[0].qty) * 100}%` }} />
            </div>
            <p className="muted">{formatPrice(r.revenue)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function AdminStatsPage({ searchParams }: { searchParams: Promise<{ ky?: string }> }) {
  await requireAdmin();
  const period = (await searchParams).ky === "tat-ca" ? "tat-ca" : "thang";
  // Lịch tính theo ngày hẹn, đơn hàng tính theo ngày bấm "đã nhận hàng"
  const since = period === "thang" ? vnIso(`${vnDateStr(Date.now()).slice(0, 7)}-01`, "00:00") : "1970-01-01T00:00:00Z";

  const db = getSupabase();
  let bookings: Booking[] = [];
  let orders: Order[] = [];
  let failed = !db;
  if (db) {
    try {
      [bookings, orders] = await Promise.all([
        readAll<Booking>((a, b) =>
          db.from("bookings").select("combo_name, price").eq("status", "done").gte("starts_at", since).order("id").range(a, b)
        ),
        readAll<Order>((a, b) =>
          db
            .from("shop_orders")
            .select("total, shop_order_items(name, qty, price)")
            .eq("status", "done")
            .gte("updated_at", since)
            .order("id")
            .range(a, b)
        ),
      ]);
    } catch {
      failed = true;
    }
  }

  const serviceRevenue = bookings.reduce((s, r) => s + r.price, 0);
  const shopRevenue = orders.reduce((s, r) => s + r.total, 0);
  const services = topSales(bookings.map((b) => ({ name: b.combo_name, qty: 1, revenue: b.price })));
  const products = topSales(
    orders.flatMap((o) => o.shop_order_items.map((i) => ({ name: i.name, qty: i.qty, revenue: i.qty * i.price })))
  );

  return (
    <main className="container section admin-main">
      <h1 className="admin-title">Thống kê</h1>
      <div className="filter-row" style={{ marginTop: 16 }}>
        {PERIODS.map((p) => (
          <Link key={p.id} href={`/admin/thong-ke?ky=${p.id}`} className="filter-chip" aria-current={period === p.id ? "page" : undefined}>
            {p.label}
          </Link>
        ))}
      </div>

      {failed ? (
        <div className="callout callout--error" style={{ marginTop: 16 }}>⚠️ Chưa tải được thống kê.</div>
      ) : (
        <>
          <div className="card" style={{ marginTop: 16 }}>
            <p className="summary-row"><span>Dịch vụ ({bookings.length} lịch xong)</span><strong>{formatPrice(serviceRevenue)}</strong></p>
            <p className="summary-row"><span>Sản phẩm ({orders.length} đơn xong)</span><strong>{formatPrice(shopRevenue)}</strong></p>
            <p className="summary-row" style={{ fontSize: "1.3rem" }}><span>Tổng doanh thu</span><strong>{formatPrice(serviceRevenue + shopRevenue)}</strong></p>
          </div>
          <Ranking title="💅 Dịch vụ làm nhiều" unit="lần" rows={services} />
          <Ranking title="🏆 Sản phẩm bán chạy" unit="cái" rows={products} />
          <p className="muted" style={{ marginTop: 16 }}>
            Chỉ tính lịch đã bấm “làm xong” và đơn đã bấm “đã nhận hàng”. Doanh thu từng sản phẩm là giá trước giảm.
          </p>
        </>
      )}
    </main>
  );
}
