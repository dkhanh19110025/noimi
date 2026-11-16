import Link from "next/link";
import { redirect } from "next/navigation";
import CancelOrderButton from "@/components/shop/CancelOrderButton";
import LogoutButton from "@/components/shop/LogoutButton";
import ReviewOrderForm from "@/components/shop/ReviewOrderForm";
import FeedbackForm from "@/components/shop/FeedbackForm";
import { formatPrice } from "@/data/combos";
import { getCustomer } from "@/lib/customer";
import { getSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type Order = {
  id: string;
  code: string;
  total: number;
  status: "placed" | "done" | "cancelled";
  cancelled_by: string | null;
  note: string | null;
  created_at: string;
  shop_order_items: { product_id: string | null; name: string; qty: number; price: number }[];
};

const STATUS = {
  placed: { label: "Đã đặt", cls: "pill--yellow" },
  done: { label: "Đã nhận hàng", cls: "pill--green" },
  cancelled: { label: "Đã hủy", cls: "pill--pink" },
} as const;

export default async function ProfilePage() {
  const me = await getCustomer();
  if (!me) redirect("/dang-nhap?next=/ho-so");

  const db = getSupabase();
  let orders: Order[] = [];
  let failed = !db;
  const reviewed: Record<string, Record<string, number>> = {};
  if (db) {
    const { data, error } = await db
      .from("shop_orders")
      .select("id, code, total, status, cancelled_by, note, created_at, shop_order_items(product_id, name, qty, price)")
      .eq("customer_id", me.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) failed = true;
    orders = (data ?? []) as Order[];

    const doneIds = orders.filter((o) => o.status === "done").map((o) => o.id);
    if (doneIds.length) {
      const { data: rv } = await db.from("product_reviews").select("order_id, product_id, stars").in("order_id", doneIds);
      for (const r of rv ?? []) {
        (reviewed[r.order_id as string] ??= {})[r.product_id as string] = r.stars as number;
      }
    }
  }

  return (
    <main className="container section">
      <span className="badge-tilt">Hồ sơ</span>
      <h1 style={{ marginTop: 24 }}>Xin chào, {me.name}</h1>
      <p className="muted" style={{ marginTop: 8 }}>📞 {me.phone} · ✉️ {me.email}</p>
      <div style={{ marginTop: 16 }}><LogoutButton /></div>

      <h2 className="reviews-heading">Đơn hàng của tôi ({orders.length})</h2>
      {failed && <div className="callout callout--error">⚠️ Chưa tải được đơn hàng.</div>}
      {!failed && orders.length === 0 && (
        <div className="callout">📦 Bạn chưa có đơn nào. <Link href="/shopping" className="hl">Đi mua sắm</Link></div>
      )}
      <ul className="admin-list" style={{ listStyle: "none", padding: 0 }}>
        {orders.map((o) => {
          const st = STATUS[o.status];
          return (
            <li key={o.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <h3>{o.code}</h3>
                <span className={`pill ${st.cls}`}>{st.label}{o.status === "cancelled" && o.cancelled_by === "admin" ? " (bởi tiệm)" : ""}</span>
              </div>
              <p className="muted">
                {new Date(o.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" })}
              </p>
              <ul style={{ margin: "10px 0", paddingLeft: 20 }}>
                {o.shop_order_items.map((i, k) => (
                  <li key={k}>{i.name} × {i.qty} — {formatPrice(i.price * i.qty)}</li>
                ))}
              </ul>
              {o.note && <p className="muted">Ghi chú: {o.note}</p>}
              <p style={{ marginTop: 8 }}><strong>Tổng: {formatPrice(o.total)}</strong></p>
              {o.status === "placed" && <div style={{ marginTop: 12 }}><CancelOrderButton id={o.id} code={o.code} /></div>}
              {o.status === "done" && (
                <ReviewOrderForm orderId={o.id} items={o.shop_order_items} done={reviewed[o.id] ?? {}} />
              )}
            </li>
          );
        })}
      </ul>

      <h2 className="reviews-heading">Góp ý cho tiệm</h2>
      <FeedbackForm />
    </main>
  );
}
