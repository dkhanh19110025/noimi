"use client";

import { useEffect } from "react";

/** Xem ảnh lớn toàn màn hình. Đóng: nút Đóng, chạm nền, hoặc Esc. Phím ← → để chuyển ảnh. */
export default function ImageLightbox({
  images,
  index,
  label,
  onChange,
  onClose,
}: {
  images: string[];
  index: number;
  label: string;
  onChange: (i: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onChange((index + 1) % images.length);
      if (e.key === "ArrowLeft") onChange((index - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index, images.length, onChange, onClose]);

  return (
    <div className="feedback-lightbox" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={images[index]} alt={`${label} ${index + 1}`} onClick={(e) => e.stopPropagation()} />
      <button type="button" className="btn btn--white feedback-lightbox__close" onClick={onClose} autoFocus>
        ✕ Đóng
      </button>
    </div>
  );
}
