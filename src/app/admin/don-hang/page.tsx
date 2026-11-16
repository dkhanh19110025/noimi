import Link from "next/link";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { formatPrice } from "@/data/combos";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase-server";
import { adminOrderAction } from "../shop-actions";

export const dynamic = "force-dynamic";

type Order = {
  id: string; code: string; customer_name: string; customer_phone: string; customer_email: string;
  note: string | null; total: number; status: "placed" | "done" | "cancelled"; cancelled_by: string | null;
  created_at: string; shop_order_items: { name: string; qty: number; price: number }[];
};

const MESSAGES: Record<string, { text: string; error?: boolean }> = {
  done: { text: "✅ Đã đánh dấu khách nhận hàng." },
  cancelled: { text: "🗑️ Đã hủy đơn, hoàn kho và gửi mail cho khách." },
  error: { text: "⚠️ Có lỗi, vui lòng thử lại.", error: true },
};
const TABS = [
  ["", "🟡 Chờ xử lý", "placed"],
  ["done", "✅ Đã nhận", "done"],
  ["cancelled", "✖ Đã hủy", "cancelled"],
] as const;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string; msg?: string }> }) {
  await requireAdmin();
  const { tab = "", msg } = await searchParams;
  const current = TABS.find((t) => t[0] === tab) ?? TABS[0];
  const flash = msg ? MESSAGES[msg] : undefined;

  const db = getSupabase();
  let orders: Order[] = [];
  let counts: Record<string, number> = {};
  let loadError = !db;
  if (db) {
    const countOf = (status: string) =>
      db.from("shop_orders").select("id", { count: "exact", head: true }).eq("status", status);
    const [list, placed, done, cancelled] = await Promise.all([
      db
        .from("shop_orders")
        .select("id, code, customer_name, customer_phone, customer_email, note, total, status, cancelled_by, created_at, shop_order_items(name, qty, price)")
        .eq("status", current[2])
        .order("created_at", { ascending: current[2] === "placed" })
        .limit(100),
      countOf("placed"),
      countOf("done"),
      countOf("cancelled"),
    ]);
    if (list.error || placed.error || done.error || cancelled.error) loadError = true;
    orders = (list.data ?? []) as Order[];
    counts = { placed: placed.count ?? 0, done: done.count ?? 0, cancelled: cancelled.count ?? 0 };
  }

  return (
    <main className="container section admin-main">
      <h1 className="admin-title">Đơn hàng</h1>
      <div className="admin-tabs" role="tablist">
        {TABS.map(([key, label, status]) => (
          <Link
            key={status}
            href={key ? `/admin/don-hang?tab=${key}` : "/admin/don-hang"}
            role="tab"
            aria-selected={current[2] === status}
            className={`pill interactive${current[2] === status ? " pill--blue" : " pill--white"}`}
          >
            {label} ({counts[status] ?? 0})
          </Link>
        ))}
      </div>

      {flash && (
        <div className={`callout${flash.error ? " callout--error" : ""}`} style={{ marginTop: 16 }} role={flash.error ? "alert" : "status"}>
          {flash.text}
        </div>
      )}
      {loadError && <div className="callout callout--error" style={{ marginTop: 16 }}>⚠️ Không tải được dữ liệu.</div>}
      {!loadError && orders.length === 0 && <div className="callout" style={{ marginTop: 24 }}>😌 Không có đơn nào.</div>}

      <ul className="admin-list">
        {orders.map((o) => (
          <li key={o.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <h3>{o.code} · {o.customer_name}</h3>
              <strong>{formatPrice(o.total)}</strong>
            </div>
            <p className="muted">
              📞 <a href={`tel:${o.customer_phone}`}>{o.customer_phone}</a> · ✉️ {o.customer_email} ·{" "}
              {new Date(o.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" })}
            </p>
            <ul style={{ margin: "10px 0", paddingLeft: 20 }}>
              {o.shop_order_items.map((i, k) => <li key={k}>{i.name} × {i.qty} — {formatPrice(i.price * i.qty)}</li>)}
            </ul>
            {o.note && <p className="muted">Ghi chú: {o.note}</p>}
            {o.status === "cancelled" && <p className="muted">Hủy bởi: {o.cancelled_by === "admin" ? "tiệm" : "khách"}</p>}
            {o.status === "placed" && (
              <div className="admin-hist__actions" style={{ marginTop: 12 }}>
                <form action={adminOrderAction}>
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="action" value="done" />
                  <input type="hidden" name="tab" value={current[0]} />
                  <button type="submit" className="btn btn--green interactive">✅ Khách đã nhận</button>
                </form>
                <form action={adminOrderAction}>
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="action" value="cancel" />
                  <input type="hidden" name="tab" value={current[0]} />
                  <ConfirmButton
                    className="btn btn--pink interactive"
                    title={`Hủy đơn ${o.code}?`}
                    message="Sản phẩm sẽ được trả lại kho và khách nhận mail báo hủy."
                    confirmLabel="✖ Hủy đơn"
                    cancelLabel="Giữ đơn"
                  >
                    ✖ Hủy đơn
                  </ConfirmButton>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
