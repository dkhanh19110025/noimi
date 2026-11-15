"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { shop } from "@/data/shop";

const ZALO_URL = `https://zalo.me/${shop.zaloPhone}`;

/** Nút Zalo nhỏ ở góc, hiện ở mọi trang khách. Bấm vào mở khung mã QR ngay tại trang (không rời trang). */
export default function ZaloFloat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  // Các nút khác trong trang (vd. Hủy/Đổi lịch) có thể mở khung này
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("open-zalo", show);
    return () => window.removeEventListener("open-zalo", show);
  }, []);

  // Tạo QR khi mở lần đầu (tải thư viện khi cần để trang nhẹ)
  useEffect(() => {
    if (!open || qr) return;
    let alive = true;
    import("qrcode")
      .then((m) =>
        m.toDataURL(ZALO_URL, { width: 480, margin: 1, color: { dark: "#1f1b16", light: "#ffffff" } })
      )
      .then((url) => alive && setQr(url))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open, qr]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      openerRef.current?.focus();
    };
  }, [open]);

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        className="zalo-float interactive"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Liên hệ tiệm qua Zalo"
      >
        💬 <span>Zalo</span>
      </button>

      {open && (
        <div className="zalo-modal" onClick={() => setOpen(false)}>
          <div
            className="zalo-modal__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="zalo-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="zalo-title">💬 Nhắn Zalo cho tiệm</h2>
            <p className="muted">Quét mã QR bằng Zalo để nhắn tin.</p>
            <div className="zalo-modal__qr">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt={`Mã QR Zalo của ${shop.name}`} width={240} height={240} />
              ) : (
                <span className="muted">⏳ Đang tạo mã…</span>
              )}
            </div>
            <p className="zalo-modal__phone">{shop.zaloPhone}</p>
            <div className="zalo-modal__actions">
              <a
                className="btn btn--blue interactive"
                href={ZALO_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Mở Zalo
              </a>
              <button
                ref={closeRef}
                type="button"
                className="btn btn--white interactive"
                onClick={() => setOpen(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
