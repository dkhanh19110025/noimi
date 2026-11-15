"use client";

import { useEffect, useState } from "react";

const images = [
  "/combos/feedback.webp",
  "/combos/feedback1.webp",
  "/combos/feedback2.webp",
  "/combos/feedback3.webp",
  "/combos/feedback4.webp",
];

/** Băng chuyền feedback: chạy liên tục từ phải sang trái, mỗi ảnh nằm trong khung cùng cỡ. Bấm vào ảnh để xem lớn. */
export default function FeedbackStrip() {
  const [open, setOpen] = useState<number | null>(null);
  // Nhân đôi danh sách để vòng lặp nối liền không bị giật
  const loop = [...images, ...images];

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % images.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + images.length) % images.length));
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <section className="feedback-strip" aria-label="Feedback của khách">
      <p className="feedback-strip__title">💬 Khách nói gì <span className="muted">· chạm vào ảnh để xem lớn</span></p>
      <div className="feedback-strip__viewport">
        <ul className="feedback-strip__track">
          {loop.map((src, i) => (
            <li key={i} className="feedback-strip__item" aria-hidden={i >= images.length ? true : undefined}>
              <button
                type="button"
                className="feedback-strip__btn"
                tabIndex={i >= images.length ? -1 : 0}
                aria-label={`Xem lớn feedback ${(i % images.length) + 1}`}
                onClick={() => setOpen(i % images.length)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {open !== null && (
        <div className="feedback-lightbox" role="dialog" aria-modal="true" aria-label="Feedback của khách" onClick={() => setOpen(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[open]} alt={`Feedback của khách ${open + 1}`} onClick={(e) => e.stopPropagation()} />
          <button type="button" className="btn btn--white feedback-lightbox__close" onClick={() => setOpen(null)} autoFocus>
            ✕ Đóng
          </button>
        </div>
      )}
    </section>
  );
}
