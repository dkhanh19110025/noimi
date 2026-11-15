import Link from "next/link";
import AdminTabs from "@/components/admin/AdminTabs";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase-server";
import { fmtDayLong, fmtTime, STATUS_ICON, STATUS_LABEL, STATUS_PILL } from "@/lib/format";
import { vnDateStr } from "@/data/booking";
import { formatPrice } from "@/data/combos";
import { deleteBooking } from "../actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  code: string;
  combo_name: string;
  price: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  note: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
};

export default async function AdminHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  await requireAdmin();
  const { msg } = await searchParams;

  const db = getSupabase();
  let rows: Row[] = [];
  let loadError = "";

  if (!db) {
    loadError = "Chưa kết nối database.";
  } else {
    const { data, error } = await db
      .from("bookings")
      .select(
        "id, code, combo_name, price, customer_name, customer_phone, customer_email, note, starts_at, ends_at, status"
      )
      .in("status", ["done", "cancelled", "no_show"])
      .order("starts_at", { ascending: false })
      .limit(300);
    if (error) loadError = "Không tải được lịch. Vui lòng thử lại.";
    rows = (data ?? []) as Row[];
  }

  const done = rows.filter((r) => r.status === "done");
  const revenue = done.reduce((s, r) => s + r.price, 0);

  return (
    <main className="container section admin-main">
      <h1 className="admin-title">Đã xong · Đã hủy</h1>
      <AdminTabs current="history" />

      {msg === "deleted" && (
        <div className="callout" style={{ marginTop: 16 }} role="status">
          🗑️ Đã xóa lịch khỏi hệ thống.
        </div>
      )}
      {msg === "error" && (
        <div className="callout callout--error" style={{ marginTop: 16 }} role="alert">
          ⚠️ Không xóa được. Vui lòng thử lại.
        </div>
      )}

      <p className="muted admin-summary">
        <span className="pill pill--green">{done.length} đã xong</span>
        {revenue > 0 && <span className="pill pill--yellow">Doanh thu {formatPrice(revenue)}</span>}
      </p>

      {loadError && (
        <div className="callout callout--error" style={{ marginTop: 16 }}>
          ⚠️ {loadError}
        </div>
      )}

      {!loadError && rows.length === 0 && (
        <div className="callout" style={{ marginTop: 24 }}>
          😌 Chưa có lịch nào đã xong hoặc đã hủy.
        </div>
      )}

      <ul className="admin-list">
        {rows.map((r) => (
          <li key={r.id} className="card admin-hist">
            <div className="admin-item admin-item--static">
              <div className="admin-item__time">
                <strong>{fmtTime(r.starts_at)}</strong>
                <span>{fmtDayLong(vnDateStr(Date.parse(r.starts_at))).split(", ")[1]}</span>
              </div>
              <div className="admin-item__body">
                <h3>{r.customer_name}</h3>
                <p className="admin-item__combo">
                  {r.combo_name}{r.price > 0 && <> · <strong>{formatPrice(r.price)}</strong></>}
                </p>
                <p className="muted admin-item__line">📞 {r.customer_phone}</p>
                {r.customer_email && <p className="muted admin-item__line">✉️ {r.customer_email}</p>}
                {r.note && <p className="admin-item__note">📝 {r.note}</p>}
                <p className="muted admin-item__line">Mã lịch: {r.code}</p>
              </div>
              <span className={`pill ${STATUS_PILL[r.status] ?? ""}`}>
                {STATUS_ICON[r.status]} {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </div>
            <div className="admin-hist__actions">
              <Link href={`/admin/lich/${r.id}`} className="btn btn--white interactive">
                Chi tiết
              </Link>
              <form action={deleteBooking}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="back" value="history" />
                <ConfirmButton
                  className="btn btn--pink interactive"
                  message={`Xóa hẳn lịch của ${r.customer_name}? Toàn bộ dữ liệu lịch này sẽ mất và không khôi phục được.`}
                >
                  🗑️ Xóa
                </ConfirmButton>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
