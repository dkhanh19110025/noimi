"use client";

import { useState } from "react";
import ImageLightbox from "@/components/ImageLightbox";
import { feedbackImages } from "@/data/feedback-images";

export type PublicReview = { id: string; name: string; stars: number; content: string; created_at: string };

const COLORS = ["blue", "pink", "green", "yellow"] as const;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

/** Gửi form lên /api/phan-hoi. Trả về thông báo lỗi, hoặc "" nếu thành công. */
async function send(payload: Record<string, unknown>): Promise<string> {
  try {
    const res = await fetch("/api/phan-hoi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    return json.ok ? "" : json.error ?? "Có lỗi xảy ra. Vui lòng thử lại.";
  } catch {
    return "Không gửi được. Kiểm tra mạng rồi thử lại.";
  }
}

/** Ô bẫy bot: người thật không thấy và không điền. */
function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="hp-field" aria-hidden="true">
      <label>
        Website
        <input type="text" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}

function ReviewForm() {
  const [name, setName] = useState("");
  const [stars, setStars] = useState(0);
  const [content, setContent] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Bạn nhập tên giúp mình nhé.");
    if (!stars) return setError("Bạn chọn số sao nhé.");
    if (!content.trim()) return setError("Bạn viết vài dòng cảm nhận nhé.");
    setError("");
    setBusy(true);
    const err = await send({ type: "review", name, stars, content, website });
    setBusy(false);
    if (err) return setError(err);
    setDone(true);
  }

  if (done) {
    return (
      <div className="callout" role="status">
        💖 Cảm ơn bạn! Đánh giá sẽ hiện trên trang sau khi tiệm xem qua.
      </div>
    );
  }

  return (
    <form className="card review-form" onSubmit={submit} noValidate>
      <h3>Viết đánh giá</h3>
      <div className="form-group">
        <div className="float-field">
          <input id="r-name" className="form-input" type="text" placeholder=" " maxLength={60} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          <label htmlFor="r-name">Tên của bạn <span className="form-required">*</span></label>
        </div>
      </div>

      <div className="form-group">
        <div role="radiogroup" aria-label="Số sao" className="star-input">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={stars === n}
              aria-label={`${n} sao`}
              className={`star-input__btn${n <= stars ? " is-on" : ""}`}
              onClick={() => setStars(n)}
            >
              {n <= stars ? "★" : "☆"}
            </button>
          ))}
          <span className="muted star-input__hint">{stars ? `${stars}/5 sao` : "Chạm để chọn sao"}</span>
        </div>
      </div>

      <div className="form-group">
        <div className="float-field">
          <textarea id="r-content" className="form-input form-textarea" rows={4} maxLength={600} placeholder=" " value={content} onChange={(e) => setContent(e.target.value)} />
          <label htmlFor="r-content">Cảm nhận của bạn <span className="form-required">*</span></label>
        </div>
      </div>

      <Honeypot value={website} onChange={setWebsite} />
      {error && <span className="form-error" role="alert">{error}</span>}
      <button type="submit" className="btn interactive" disabled={busy}>{busy ? "Đang gửi…" : "Gửi đánh giá"}</button>
    </form>
  );
}

function NoteForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [content, setContent] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return setError("Bạn viết góp ý giúp mình nhé.");
    setError("");
    setBusy(true);
    const err = await send({ type: "feedback", name, phone, content, website });
    setBusy(false);
    if (err) return setError(err);
    setDone(true);
  }

  if (done) {
    return (
      <div className="callout" role="status">
        🙏 Cảm ơn bạn đã góp ý! Tiệm sẽ đọc kỹ và cải thiện.
      </div>
    );
  }

  return (
    <form className="card review-form" onSubmit={submit} noValidate>
      <h3>Góp ý cho tiệm</h3>
      <p className="muted">Góp ý chỉ gửi riêng cho chủ tiệm, không hiện công khai.</p>
      <div className="form-group">
        <div className="float-field">
          <textarea id="n-content" className="form-input form-textarea" rows={5} maxLength={1000} placeholder=" " value={content} onChange={(e) => setContent(e.target.value)} />
          <label htmlFor="n-content">Bạn muốn góp ý gì? <span className="form-required">*</span></label>
        </div>
      </div>
      <div className="form-group">
        <div className="float-field">
          <input id="n-name" className="form-input" type="text" placeholder=" " maxLength={60} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          <label htmlFor="n-name">Tên (không bắt buộc)</label>
        </div>
      </div>
      <div className="form-group">
        <div className="float-field">
          <input id="n-phone" className="form-input" type="tel" placeholder=" " maxLength={20} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <label htmlFor="n-phone">Số điện thoại (nếu muốn tiệm liên hệ lại)</label>
        </div>
      </div>
      <Honeypot value={website} onChange={setWebsite} />
      {error && <span className="form-error" role="alert">{error}</span>}
      <button type="submit" className="btn interactive" disabled={busy}>{busy ? "Đang gửi…" : "Gửi góp ý"}</button>
    </form>
  );
}

export default function ReviewsView({ reviews }: { reviews: PublicReview[] }) {
  const [tab, setTab] = useState<"review" | "note">("review");
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <div className="admin-tabs" role="tablist" aria-label="Đánh giá và góp ý" style={{ marginTop: 24 }}>
        <button type="button" role="tab" aria-selected={tab === "review"} className={`pill interactive${tab === "review" ? " pill--blue" : " pill--white"}`} onClick={() => setTab("review")}>
          ⭐ Đánh giá
        </button>
        <button type="button" role="tab" aria-selected={tab === "note"} className={`pill interactive${tab === "note" ? " pill--blue" : " pill--white"}`} onClick={() => setTab("note")}>
          💌 Góp ý
        </button>
      </div>

      {tab === "review" ? (
        <>
          <h2 className="reviews-heading">Khách nói gì</h2>
          {reviews.length === 0 ? (
            <p className="muted">Chưa có đánh giá nào. Bạn là người đầu tiên nhé!</p>
          ) : (
            <ul className="combo-grid" style={{ listStyle: "none", padding: 0 }}>
              {reviews.map((r, i) => (
                <li key={r.id} className="card review-card" style={{ background: `var(--${COLORS[i % COLORS.length]})` }}>
                  <p aria-label={`${r.stars} trên 5 sao`}>
                    {"★".repeat(r.stars)}
                    {"☆".repeat(5 - r.stars)}
                  </p>
                  <p>“{r.content}”</p>
                  <p className="muted">— {r.name} · {fmtDate(r.created_at)}</p>
                </li>
              ))}
            </ul>
          )}

          <h2 className="reviews-heading">Tin nhắn từ khách</h2>
          <ul className="feedback-grid">
            {feedbackImages.map((src, i) => (
              <li key={src} className="feedback-strip__item">
                <button type="button" className="feedback-strip__btn" aria-label={`Xem lớn feedback ${i + 1}`} onClick={() => setOpen(i)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" />
                </button>
              </li>
            ))}
          </ul>

          <h2 className="reviews-heading">Bạn đã dùng dịch vụ?</h2>
          <ReviewForm />
        </>
      ) : (
        <>
          <h2 className="reviews-heading">Góp ý</h2>
          <NoteForm />
        </>
      )}

      {open !== null && (
        <ImageLightbox images={feedbackImages} index={open} label="Feedback của khách" onChange={setOpen} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
