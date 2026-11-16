"use client";

import { useState } from "react";

export default function FeedbackForm() {
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/shop/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok) {
        setSent(true);
        setContent("");
      } else setError(json?.error ?? "Không gửi được góp ý.");
    } catch {
      setError("Không kết nối được server.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="card review-form">
      <h3>💌 Góp ý riêng cho tiệm</h3>
      <p className="muted">Chỉ chủ tiệm đọc được, không hiện công khai.</p>
      <textarea
        className="form-input form-textarea"
        rows={3}
        maxLength={1000}
        required
        value={content}
        onChange={(e) => { setContent(e.target.value); setSent(false); }}
        aria-label="Nội dung góp ý"
      />
      {sent && <div className="callout" role="status">💖 Cảm ơn bạn, tiệm đã nhận được góp ý.</div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="btn btn--blue interactive" disabled={busy}>{busy ? "Đang gửi…" : "Gửi góp ý"}</button>
    </form>
  );
}
