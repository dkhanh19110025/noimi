import Link from "next/link";
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
  searchParams: Promise<{ v?: string }>;
}) {
  await requireAdmin();

  const { v } = await searchParams;
  const past = v === "past";
  const today = vnDateStr(Date.now());

  const db = getSupabase();
  let rows: Row[] = [];
  let loadError = "";

  if (!db) {
    loadError = "Chưa kết nối database.";
  } else {
    const nowIso = new Date().toISOString();
    let q = db
      .from("bookings")
      .select(
        "id, code, combo_name, price, customer_name, customer_phone, customer_email, note, starts_at, ends_at, status"
      );
    q = past
      ? q.lt("ends_at", nowIso).order("starts_at", { ascending: false }).limit(100)
      : q.gte("ends_at", nowIso).order("starts_at", { ascending: true }).limit(200);
    const { data, error } = await q;
    if (error) loadError = "Không tải được lịch. Vui lòng thử lại.";
    rows = (data ?? []) as Row[];
  }

  const active = rows.filter((r) => r.status === "confirmed" || r.status === "arrived");
  const revenue = rows.filter((r) => r.status === "arrived").reduce((s, r) => s + r.price, 0);

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

      <div className="admin-tabs" role="tablist" aria-label="Lọc lịch">
        <Link
          href="/admin"
          role="tab"
          aria-selected={!past}
          className={`pill interactive${!past ? " pill--blue" : " pill--white"}`}
        >
          🗓️ Sắp tới
        </Link>
        <Link
          href="/admin?v=past"
          role="tab"
          aria-selected={past}
          className={`pill interactive${past ? " pill--blue" : " pill--white"}`}
        >
          🕘 Đã qua
        </Link>
      </div>

      <p className="muted admin-summary">
        <span className="pill pill--yellow">{active.length} lịch</span>
        {revenue > 0 && <span className="pill pill--green">Đã thu {formatPrice(revenue)}</span>}
      </p>

      {loadError && (
        <div className="callout callout--error" style={{ marginTop: 16 }}>
          ⚠️ {loadError}
        </div>
      )}

      {!loadError && rows.length === 0 && (
        <div className="callout" style={{ marginTop: 24 }}>
          😌 {past ? "Chưa có lịch nào đã qua." : "Chưa có lịch sắp tới."}
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
                      {r.combo_name} · <strong>{formatPrice(r.price)}</strong>
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
