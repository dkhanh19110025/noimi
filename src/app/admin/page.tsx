import Link from "next/link";
import AdminTabs from "@/components/admin/AdminTabs";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase-server";
import { vnDateStr } from "@/data/booking";
import {
  fmtDayLong,
  fmtTime,
  STATUS_ICON,
  STATUS_LABEL,
  STATUS_PILL,
} from "@/lib/format";
import { formatPrice } from "@/data/combos";

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

/** Ngày (YYYY-MM-DD, giờ Việt Nam) của một mốc thời gian */
const dayOf = (iso: string) => vnDateStr(Date.parse(iso));

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  await requireAdmin();

  const { msg } = await searchParams;
  const today = vnDateStr(Date.now());

  const db = getSupabase();
  let rows: Row[] = [];
  let loadError = "";

  if (!db) {
    loadError = "Chưa kết nối database.";
  } else {
    // Chỉ lịch còn cần xử lý (chưa làm xong, chưa hủy), sớm nhất lên trước
    const { data, error } = await db
      .from("bookings")
      .select(
        "id, code, combo_name, price, customer_name, customer_phone, customer_email, note, starts_at, ends_at, status"
      )
      .in("status", ["confirmed", "arrived"])
      .order("starts_at", { ascending: true })
      .limit(300);
    if (error) loadError = "Không tải được lịch. Vui lòng thử lại.";
    rows = (data ?? []) as Row[];
  }


  // Gom theo ngày, giữ nguyên thứ tự đã sắp
  const groups: { day: string; items: Row[] }[] = [];
  for (const r of rows) {
    const day = dayOf(r.starts_at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(r);
    else groups.push({ day, items: [r] });
  }

  return (
    <main className="container section admin-main">
      <h1 className="admin-title">Lịch hẹn</h1>

      <AdminTabs current="active" />

      {msg === "done" && (
        <div className="callout" style={{ marginTop: 16 }} role="status">
          🎉 Đã chuyển lịch sang mục Đã xong.
        </div>
      )}
      {msg === "deleted" && (
        <div className="callout" style={{ marginTop: 16 }} role="status">
          🗑️ Đã hủy và xóa lịch.
        </div>
      )}
      {msg === "error" && (
        <div className="callout callout--error" style={{ marginTop: 16 }} role="alert">
          ⚠️ Không thực hiện được. Vui lòng thử lại.
        </div>
      )}

      <p className="muted admin-summary">
        <span className="pill pill--yellow">{rows.length} lịch</span>
      </p>

      {loadError && (
        <div className="callout callout--error" style={{ marginTop: 16 }}>
          ⚠️ {loadError}
        </div>
      )}

      {!loadError && rows.length === 0 && (
        <div className="callout" style={{ marginTop: 24 }}>
          😌 Chưa có lịch nào đang chờ.
        </div>
      )}

      {groups.map((g) => (
        <section key={g.day} className="admin-day">
          <h2 className="admin-day__title">
            {fmtDayLong(g.day)}
            {g.day === today && <span className="pill pill--orange">Hôm nay</span>}
          </h2>
          <ul className="admin-list">
            {g.items.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/lich/${r.id}`}
                  className={`card admin-item interactive${
                    r.status === "cancelled" || r.status === "no_show" ? " admin-item--dim" : ""
                  }`}
                >
                  <div className="admin-item__time">
                    <strong>{fmtTime(r.starts_at)}</strong>
                    <span>đến {fmtTime(r.ends_at)}</span>
                  </div>
                  <div className="admin-item__body">
                    <h3>{r.customer_name}</h3>
                    <p className="admin-item__combo">
                      {r.combo_name}{r.price > 0 && <> · <strong>{formatPrice(r.price)}</strong></>}
                    </p>
                    <p className="muted admin-item__line">📞 {r.customer_phone}</p>
                    {r.customer_email && (
                      <p className="muted admin-item__line">✉️ {r.customer_email}</p>
                    )}
                    {r.note && <p className="admin-item__note">📝 {r.note}</p>}
                    <p className="muted admin-item__line">Mã lịch: {r.code}</p>
                  </div>
                  <span className={`pill ${STATUS_PILL[r.status] ?? ""}`}>
                    {STATUS_ICON[r.status]} {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
