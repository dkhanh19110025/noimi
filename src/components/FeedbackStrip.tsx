"use client";

import { useState } from "react";
import ImageLightbox from "@/components/ImageLightbox";
import { feedbackImages as images } from "@/data/feedback-images";

/** Băng chuyền feedback: chạy liên tục từ phải sang trái, mỗi ảnh nằm trong khung cùng cỡ. Bấm vào ảnh để xem lớn. */
export default function FeedbackStrip() {
  const [open, setOpen] = useState<number | null>(null);
  // Nhân đôi danh sách để vòng lặp nối liền không bị giật
  const loop = [...images, ...images];

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
        <ImageLightbox images={images} index={open} label="Feedback của khách" onChange={setOpen} onClose={() => setOpen(null)} />
      )}
    </section>
  );
}
