import Link from "next/link";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase-server";
import { deleteNote, deleteReview, setReviewStatus } from "../actions";

export const dynamic = "force-dynamic";

type Review = { id: string; name: string; stars: number; content: string; status: string; created_at: string };
type Note = { id: string; name: string | null; phone: string | null; content: string; created_at: string };

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const MESSAGES: Record<string, { text: string; error?: boolean }> = {
  approved: { text: "✅ Đã duyệt: đánh giá đã hiện trên trang đánh giá." },
  hidden: { text: "🙈 Đã ẩn đánh giá khỏi trang công khai." },
  deleted: { text: "🗑️ Đã xóa." },
  error: { text: "⚠️ Có lỗi, vui lòng thử lại.", error: true },
};

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; msg?: string }>;
}) {
  await requireAdmin();
  const { tab, msg } = await searchParams;
  const onNotes = tab === "gop-y";
  const flash = msg ? MESSAGES[msg] : undefined;

  const db = getSupabase();
  let reviews: Review[] = [];
  let notes: Note[] = [];
  let loadError = "";

  if (!db) {
    loadError = "Chưa kết nối database.";
  } else {
    const [r, n] = await Promise.all([
      db
        .from("reviews")
        .select("id, name, stars, content, status, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      db
        .from("feedback_notes")
        .select("id, name, phone, content, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (r.error || n.error) loadError = "Không tải được dữ liệu. Vui lòng thử lại.";
    reviews = (r.data ?? []) as Review[];
    notes = (n.data ?? []) as Note[];
  }

  const pending = reviews.filter((x) => x.status === "pending");
  const approved = reviews.filter((x) => x.status === "approved");

  return (
    <main className="container section admin-main">
      <h1 className="admin-title">Phản hồi của khách</h1>

      <div className="admin-tabs" role="tablist" aria-label="Loại phản hồi">
        <Link
          href="/admin/phan-hoi"
          role="tab"
          aria-selected={!onNotes}
          className={`pill interactive${!onNotes ? " pill--blue" : " pill--white"}`}
        >
          ⭐ Đánh giá{pending.length > 0 ? ` (${pending.length} chờ duyệt)` : ""}
        </Link>
        <Link
          href="/admin/phan-hoi?tab=gop-y"
          role="tab"
          aria-selected={onNotes}
          className={`pill interactive${onNotes ? " pill--blue" : " pill--white"}`}
        >
          💌 Góp ý ({notes.length})
        </Link>
      </div>

      {flash && (
        <div className={`callout${flash.error ? " callout--error" : ""}`} style={{ marginTop: 16 }} role={flash.error ? "alert" : "status"}>
          {flash.text}
        </div>
      )}
      {loadError && (
        <div className="callout callout--error" style={{ marginTop: 16 }}>
          ⚠️ {loadError}
        </div>
      )}

      {!onNotes && !loadError && (
        <>
          <h2 className="reviews-heading">Chờ duyệt ({pending.length})</h2>
          {pending.length === 0 && <div className="callout">😌 Không có đánh giá nào đang chờ.</div>}
          <ul className="admin-list">
            {pending.map((r) => (
              <ReviewItem key={r.id} r={r} />
            ))}
          </ul>

          <h2 className="reviews-heading">Đang hiện công khai ({approved.length})</h2>
          {approved.length === 0 && <div className="callout">Chưa có đánh giá nào được duyệt.</div>}
          <ul className="admin-list">
            {approved.map((r) => (
              <ReviewItem key={r.id} r={r} />
            ))}
          </ul>
        </>
      )}

      {onNotes && !loadError && (
        <>
          {notes.length === 0 && (
            <div className="callout" style={{ marginTop: 24 }}>
              😌 Chưa có góp ý nào.
            </div>
          )}
          <ul className="admin-list">
            {notes.map((n) => (
              <li key={n.id} className="card admin-hist">
                <div className="admin-item admin-item--static">
                  <div className="admin-item__body">
                    <h3>{n.name || "Ẩn danh"}</h3>
                    <p className="admin-item__note" style={{ whiteSpace: "pre-wrap" }}>{n.content}</p>
                    {n.phone && <p className="muted admin-item__line">📞 {n.phone}</p>}
                    <p className="muted admin-item__line">{fmtWhen(n.created_at)}</p>
                  </div>
                </div>
                <div className="admin-hist__actions">
                  <form action={deleteNote}>
                    <input type="hidden" name="id" value={n.id} />
                    <ConfirmButton
                      className="btn btn--pink interactive"
                      title="⚠️ Xóa góp ý này?"
                      message="Góp ý sẽ bị xóa hẳn và không khôi phục được."
                    >
                      🗑️ Xóa
                    </ConfirmButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

function ReviewItem({ r }: { r: Review }) {
  const isApproved = r.status === "approved";
  return (
    <li className="card admin-hist">
      <div className="admin-item admin-item--static">
        <div className="admin-item__body">
          <h3>
            {r.name} <span aria-label={`${r.stars} trên 5 sao`}>{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</span>
          </h3>
          <p className="admin-item__note" style={{ whiteSpace: "pre-wrap" }}>“{r.content}”</p>
          <p className="muted admin-item__line">{fmtWhen(r.created_at)}</p>
        </div>
      </div>
      <div className="admin-hist__actions">
        <form action={setReviewStatus}>
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="status" value={isApproved ? "pending" : "approved"} />
          <button type="submit" className={`btn interactive${isApproved ? " btn--white" : ""}`}>
            {isApproved ? "🙈 Ẩn" : "✅ Duyệt"}
          </button>
        </form>
        <form action={deleteReview}>
          <input type="hidden" name="id" value={r.id} />
          <ConfirmButton
            className="btn btn--pink interactive"
            title="⚠️ Xóa đánh giá này?"
            message={`Đánh giá của ${r.name} sẽ bị xóa hẳn và không khôi phục được. Nếu chỉ muốn giấu đi thì bấm Ẩn.`}
          >
            🗑️ Xóa
          </ConfirmButton>
        </form>
      </div>
    </li>
  );
}
