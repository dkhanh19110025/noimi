"use client";

import { useState } from "react";

type Review = { id: string; customer_name: string; stars: number; content: string; created_at: string };

export function Stars({ value }: { value: number }) {
  const n = Math.round(value);
  return (
    <span aria-label={`${value} trên 5 sao`}>
      {"★".repeat(n)}
      {"☆".repeat(5 - n)}
    </span>
  );
}

/** Nút "xem đánh giá" bung danh sách nhận xét của khách đã mua. */
export default function ProductReviews({ productId, avg, count }: { productId: string; avg: number | null; count: number }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Review[] | null>(null);

  if (count === 0 || avg === null) return <p className="muted product-card__rating">Chưa có đánh giá</p>;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && list === null) {
      try {
        const res = await fetch(`/api/shop/reviews?product=${productId}`);
        setList((await res.json()).reviews ?? []);
      } catch {
        setList([]);
      }
    }
  }

  return (
    <div className="product-card__rating">
      <button type="button" className="link-btn" aria-expanded={open} onClick={toggle}>
        <Stars value={avg} /> {avg.toFixed(1)} · {count} đánh giá {open ? "▲" : "▼"}
      </button>
      {open && (
        <ul className="review-list">
          {list === null && <li className="muted">Đang tải…</li>}
          {list?.map((r) => (
            <li key={r.id}>
              <strong>{r.customer_name}</strong> <Stars value={r.stars} />
              <span className="pill pill--green">Đã mua hàng</span>
              {r.content && <p style={{ whiteSpace: "pre-wrap" }}>{r.content}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
