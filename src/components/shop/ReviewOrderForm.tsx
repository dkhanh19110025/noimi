"use client";

import { useState } from "react";

type Item = { product_id: string | null; name: string };
type Done = Record<string, number>; // product_id -> sao đã chấm

export default function ReviewOrderForm({ orderId, items, done }: { orderId: string; items: Item[]; done: Done }) {
  const todo = items.filter((i): i is { product_id: string; name: string } => !!i.product_id && !(i.product_id in done));
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState<Record<string, number>>({});
  const [text, setText] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reviewed = items.filter((i) => i.product_id && i.product_id in done);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const reviews = todo
      .filter((i) => stars[i.product_id])
      .map((i) => ({ product_id: i.product_id, stars: stars[i.product_id], content: text[i.product_id] ?? "" }));
    if (reviews.length === 0) return setError("Hãy chấm sao cho ít nhất một món.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/shop/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, reviews }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok) {
        window.location.reload();
        return;
      }
      setError(json?.error ?? "Không gửi được đánh giá.");
    } catch {
      setError("Không kết nối được server.");
    }
    setBusy(false);
  }

  return (
    <div style={{ marginTop: 12 }}>
      {reviewed.length > 0 && (
        <p className="muted">
          Đã đánh giá: {reviewed.map((i) => `${i.name} ${"★".repeat(done[i.product_id!])}`).join(" · ")}
        </p>
      )}
      {todo.length > 0 && !open && (
        <button type="button" className="btn btn--yellow interactive" style={{ marginTop: 8 }} onClick={() => setOpen(true)}>
          ⭐ Đánh giá sản phẩm
        </button>
      )}
      {todo.length > 0 && open && (
        <form onSubmit={submit} className="review-form" style={{ marginTop: 8 }}>
          {todo.map((i) => (
            <fieldset key={i.product_id} style={{ border: 0, padding: 0 }}>
              <legend className="form-label">{i.name}</legend>
              <div role="radiogroup" aria-label={`Số sao cho ${i.name}`} className="star-input">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={stars[i.product_id] === n}
                    aria-label={`${n} sao`}
                    className="star-input__btn"
                    onClick={() => setStars((s) => ({ ...s, [i.product_id]: n }))}
                  >
                    {n <= (stars[i.product_id] ?? 0) ? "★" : "☆"}
                  </button>
                ))}
              </div>
              <textarea
                className="form-input form-textarea"
                rows={2}
                maxLength={600}
                placeholder="Cảm nhận của bạn (không bắt buộc)"
                value={text[i.product_id] ?? ""}
                onChange={(e) => setText((t) => ({ ...t, [i.product_id]: e.target.value }))}
              />
            </fieldset>
          ))}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="submit" className="btn btn--blue interactive" disabled={busy}>{busy ? "Đang gửi…" : "Gửi đánh giá"}</button>
            <button type="button" className="btn btn--white interactive" onClick={() => setOpen(false)}>Để sau</button>
          </div>
        </form>
      )}
    </div>
  );
}
