import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase-server";
import { vnDateStr, vnInstant, isValidDateStr } from "@/data/booking";
import {
  addDays,
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
  note: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
};

export default async function AdminDayPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  await requireAdmin();

  const { d } = await searchParams;
  const today = vnDateStr(Date.now());
  const day = d && isValidDateStr(d) ? d : today;

  const db = getSupabase();
  let rows: Row[] = [];
  let loadError = "";

  if (!db) {
    loadError = "Chưa kết nối database.";
  } else {
    const start = vnInstant(day);
    const { data, error } = await db
      .from("bookings")
      .select(
        "id, code, combo_name, price, customer_name, customer_phone, note, starts_at, ends_at, status"
      )
      .gte("starts_at", new Date(start).toISOString())
      .lt("starts_at", new Date(start + 24 * 3600 * 1000).toISOString())
      .order("starts_at", { ascending: true });
    if (error) loadError = "Không tải được lịch. Vui lòng thử lại.";
    rows = (data ?? []) as Row[];
  }

  const active = rows.filter((r) => r.status === "confirmed" || r.status === "arrived");
  const revenue = rows.filter((r) => r.status === "arrived").reduce((s, r) => s + r.price, 0);

  return (
    <main className="container section admin-main">
      <div className="admin-daynav">
        <Link className="btn btn--white interactive" href={`/admin?d=${addDays(day, -1)}`} aria-label="Ngày trước">
          ←
        </Link>
        <div className="admin-daynav__title">
          <h1>{fmtDayLong(day)}</h1>
          {day !== today && (
            <Link href="/admin" className="admin-daynav__today">
              Về hôm nay
            </Link>
          )}
        </div>
        <Link className="btn btn--white interactive" href={`/admin?d=${addDays(day, 1)}`} aria-label="Ngày sau">
          →
        </Link>
      </div>

      <p className="muted admin-summary">
        <span className="pill pill--blue">{active.length} lịch</span>{" "}
        {revenue > 0 && <span className="pill pill--green">Đã thu {formatPrice(revenue)}</span>}
      </p>

      {loadError && (
        <div className="callout callout--error" style={{ marginTop: 16 }}>
          ⚠️ {loadError}
        </div>
      )}

      {!loadError && rows.length === 0 && (
        <div className="callout" style={{ marginTop: 24 }}>
          😌 Ngày này chưa có lịch nào.
        </div>
      )}

      <ul className="admin-list">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/admin/lich/${r.id}`}
              className={`card admin-item interactive${
                r.status === "cancelled" || r.status === "no_show" ? " admin-item--dim" : ""
              }`}
            >
              <div className="admin-item__time">
                <strong>{fmtTime(r.starts_at)}</strong>
                <span>{fmtTime(r.ends_at)}</span>
              </div>
              <div className="admin-item__body">
                <h2>{r.customer_name}</h2>
                <p className="muted">{r.combo_name}</p>
                <p className="muted admin-item__phone">📞 {r.customer_phone}</p>
                {r.note && <p className="admin-item__note">📝 {r.note}</p>}
              </div>
              <span className={`pill ${STATUS_PILL[r.status] ?? ""}`}>
                {STATUS_ICON[r.status]} {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
