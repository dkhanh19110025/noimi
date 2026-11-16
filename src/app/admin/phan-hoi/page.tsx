import Link from "next/link";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase-server";
import { deleteNote, deleteReview, setReviewHidden } from "../actions";

export const dynamic = "force-dynamic";

type Review = {
  id: string; customer_name: string; stars: number; content: string; hidden: boolean;
  created_at: string; products: { name: string } | null;
};
type Note = { id: string; name: string | null; phone: string | null; content: string; created_at: string };

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric",
  });
}

const MESSAGES: Record<string, { text: string; error?: boolean }> = {
  hidden: { text: "🙈 Đã ẩn đánh giá khỏi trang bán hàng." },
  shown: { text: "👀 Đánh giá đã hiện lại." },
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
        .from("product_reviews")
        .select("id, customer_name, stars, content, hidden, created_at, products(name)")
        .order("created_at", { ascending: false })
        .limit(200),
      db
        .from("feedback_notes")
        .select("id, name, phone, content, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (r.error || n.error) loadError = "Không tải được dữ liệu. Vui lòng thử lại.";
    reviews = (r.data ?? []) as unknown as Review[];
    notes = (n.data ?? []) as Note[];
  }

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
          ⭐ Đánh giá sản phẩm ({reviews.length})
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
      {loadError && <div className="callout callout--error" style={{ marginTop: 16 }}>⚠️ {loadError}</div>}

      {!onNotes && !loadError && (
        <>
          <p className="muted" style={{ marginTop: 16, textAlign: "center" }}>
            Chỉ khách đã nhận hàng mới đánh giá được. Đánh giá hiện ngay, bạn chỉ cần ẩn khi không phù hợp.
          </p>
          {reviews.length === 0 && <div className="callout" style={{ marginTop: 16 }}>😌 Chưa có đánh giá nào.</div>}
          <ul className="admin-list">
            {reviews.map((r) => (
              <li key={r.id} className={`card admin-hist${r.hidden ? " admin-prod--hidden" : ""}`}>
                <div className="admin-item admin-item--static">
                  <div className="admin-item__body">
                    <h3>
                      {r.products?.name ?? "Sản phẩm đã xóa"}{" "}
                      <span aria-label={`${r.stars} trên 5 sao`}>{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</span>
                      {r.hidden && <> <span className="pill pill--purple">Đang ẩn</span></>}
                    </h3>
                    {r.content && <p className="admin-item__note" style={{ whiteSpace: "pre-wrap" }}>“{r.content}”</p>}
                    <p className="muted admin-item__line">{r.customer_name} · {fmtWhen(r.created_at)}</p>
                  </div>
                </div>
                <div className="admin-hist__actions">
                  <form action={setReviewHidden}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="hidden" value={String(!r.hidden)} />
                    <button type="submit" className="btn btn--white interactive">{r.hidden ? "👀 Hiện lại" : "🙈 Ẩn"}</button>
                  </form>
                  <form action={deleteReview}>
                    <input type="hidden" name="id" value={r.id} />
                    <ConfirmButton
                      className="btn btn--pink interactive"
                      title="⚠️ Xóa đánh giá này?"
                      message="Đánh giá sẽ bị xóa hẳn và không khôi phục được. Nếu chỉ muốn giấu đi thì bấm Ẩn."
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

      {onNotes && !loadError && (
        <>
          {notes.length === 0 && <div className="callout" style={{ marginTop: 24 }}>😌 Chưa có góp ý nào.</div>}
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
