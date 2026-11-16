"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Nút trong <form> cần xác nhận trước khi gửi (việc không hoàn tác được).
 * Dùng khung xác nhận ngay trong trang, không dùng window.confirm
 * (một số trình duyệt nhúng / điện thoại chặn hộp thoại mặc định nên nút như "không bấm được").
 */
export default function ConfirmButton({
  message,
  title = "⚠️ Xóa hẳn lịch này?",
  className,
  confirmLabel = "🗑️ Xóa hẳn",
  cancelLabel = "Không xóa",
  children,
}: {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>

      {open && (
        <div className="zalo-modal" onClick={() => setOpen(false)}>
          <div
            className="zalo-modal__card"
            role="alertdialog"
            aria-modal="true"
            aria-label="Xác nhận"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{title}</h2>
            <p className="muted" style={{ marginTop: 8 }}>{message}</p>
            <div className="zalo-modal__actions">
              <button
                ref={cancelRef}
                type="button"
                className="btn btn--white interactive"
                onClick={() => setOpen(false)}
              >
                {cancelLabel}
              </button>
              {/* type=submit nằm trong <form> của trang → gửi lệnh xóa */}
              <button type="submit" className="btn btn--pink interactive">
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
