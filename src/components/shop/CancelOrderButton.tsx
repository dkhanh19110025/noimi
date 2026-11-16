"use client";

import { useState } from "react";

export default function CancelOrderButton({ id, code }: { id: string; code: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/shop/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok) {
        window.location.reload();
        return;
      }
      setError(json?.error ?? "Không hủy được đơn.");
    } catch {
      setError("Không kết nối được server.");
    }
    setBusy(false);
  }

  return (
    <>
      <button type="button" className="btn btn--pink interactive" onClick={() => setOpen(true)}>
        ✖ Hủy đơn
      </button>
      {open && (
        <div className="zalo-modal" onClick={() => !busy && setOpen(false)}>
          <div className="zalo-modal__card" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Hủy đơn {code}?</h2>
            <p className="muted" style={{ marginTop: 8 }}>Sản phẩm sẽ được trả lại kho và tiệm gửi email báo hủy cho bạn.</p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="zalo-modal__actions">
              <button type="button" className="btn btn--white interactive" disabled={busy} onClick={() => setOpen(false)}>Giữ đơn</button>
              <button type="button" className="btn btn--pink interactive" disabled={busy} onClick={cancel}>
                {busy ? "Đang hủy…" : "Hủy đơn"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
