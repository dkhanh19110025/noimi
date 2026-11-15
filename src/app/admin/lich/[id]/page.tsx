import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase-server";
import { formatPrice } from "@/data/combos";
import {
  fmtDate,
  fmtTime,
  STATUS_ICON,
  STATUS_LABEL,
  STATUS_PILL,
} from "@/lib/format";
import { updateNote, updateStatus } from "../../actions";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MESSAGES: Record<string, { text: string; error: boolean }> = {
  saved: { text: "✅ Đã lưu.", error: false },
  overlap: {
    text: "Giờ này đã có lịch khác nên không thể đặt lại là đã xác nhận / đã đến.",
    error: true,
  },
  error: { text: "Có lỗi khi lưu. Vui lòng thử lại.", error: true },
  db: { text: "Chưa kết nối database.", error: true },
};

export default async function AdminBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { msg } = await searchParams;
  if (!UUID.test(id)) notFound();

  const db = getSupabase();
  if (!db) notFound();

  const { data: b } = await db.from("bookings").select("*").eq("id", id).maybeSingle();
  if (!b) notFound();

  const message = msg ? MESSAGES[msg] : undefined;
  const phone: string = b.customer_phone;

  return (
    <main className="container section admin-main">
      <Link href="/admin" className="btn btn--white interactive">
        ← Về danh sách lịch
      </Link>

      <h1 style={{ marginTop: 20, fontSize: "clamp(2rem, 7vw, 3rem)" }}>{b.customer_name}</h1>
      <p style={{ marginTop: 8 }}>
        <span className={`pill ${STATUS_PILL[b.status] ?? ""}`}>
          {STATUS_ICON[b.status]} {STATUS_LABEL[b.status] ?? b.status}
        </span>
      </p>

      {message && (
        <div className={`callout ${message.error ? "callout--error" : ""}`} style={{ marginTop: 16 }} role="status">
          {message.error ? "⚠️ " : ""}
          {message.text}
        </div>
      )}

      <div className="confirm-actions" style={{ marginTop: 20 }}>
        <a className="btn interactive" href={`tel:${phone}`}>📞 Gọi {phone}</a>
        <a
          className="btn btn--blue interactive"
          href={`https://zalo.me/${phone}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          💬 Nhắn Zalo
        </a>
      </div>

      <div className="card booking-summary" style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: "1.3rem", marginBottom: 12 }}>📋 Chi tiết lịch</h2>
        <div className="summary-row"><span>Mã:</span><strong>{b.code}</strong></div>
        <div className="summary-row"><span>Combo:</span><strong>{b.combo_name}</strong></div>
        <div className="summary-row"><span>Giá:</span><strong>{formatPrice(b.price)}</strong></div>
        <div className="summary-row"><span>Ngày:</span><strong>{fmtDate(b.starts_at)}</strong></div>
        <div className="summary-row">
          <span>Giờ:</span>
          <strong>{fmtTime(b.starts_at)} – {fmtTime(b.ends_at)}</strong>
        </div>
        {b.customer_email && (
          <div className="summary-row"><span>Email:</span><strong>{b.customer_email}</strong></div>
        )}
        <div className="summary-row"><span>Nguồn:</span><strong>{b.source}</strong></div>
        <div className="summary-row">
          <span>Đặt lúc:</span>
          <strong>{fmtDate(b.created_at)} {fmtTime(b.created_at)}</strong>
        </div>
      </div>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: "1.4rem" }}>Đổi trạng thái</h2>
        <div className="admin-status-grid">
          {(["confirmed", "arrived", "cancelled", "no_show"] as const).map((s) => (
            <form action={updateStatus} key={s}>
              <input type="hidden" name="id" value={b.id} />
              <input type="hidden" name="status" value={s} />
              <button
                className={`btn interactive admin-status-btn ${
                  b.status === s ? "admin-status-btn--current" : "btn--white"
                }`}
                type="submit"
                disabled={b.status === s}
              >
                {STATUS_ICON[s]} {STATUS_LABEL[s]}
              </button>
            </form>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: "1.4rem" }}>Ghi chú</h2>
        <form action={updateNote} className="booking-form" style={{ marginTop: 12 }}>
          <input type="hidden" name="id" value={b.id} />
          <textarea
            className="form-input form-textarea"
            name="note"
            rows={4}
            maxLength={500}
            defaultValue={b.note ?? ""}
            aria-label="Ghi chú"
          />
          <button className="btn btn--blue interactive" type="submit">
            💾 Lưu ghi chú
          </button>
        </form>
      </section>
    </main>
  );
}
