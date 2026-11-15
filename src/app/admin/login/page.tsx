"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        // Giữ nút ở trạng thái "đang vào" và chuyển trang hẳn (cookie đã có),
        // tránh bấm lần hai và tránh đợi router.refresh().
        window.location.replace("/admin");
        return;
      }
      const json = await res.json().catch(() => null);
      setError(json?.error?.message ?? "Không đăng nhập được.");
      setBusy(false);
    } catch {
      setError("Không kết nối được server. Vui lòng thử lại.");
      setBusy(false);
    }
  }

  return (
    <main className="container section">
      <div className="card admin-login">
        <span className="badge-tilt">Dành cho chủ tiệm</span>
        <h1 style={{ marginTop: 20, fontSize: "clamp(2rem, 8vw, 2.8rem)" }}>Đăng nhập</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Nhập mật khẩu để xem và quản lý lịch hẹn.
        </p>

        <form onSubmit={submit} className="booking-form" style={{ marginTop: 20 }}>
          <label className="form-label">
            <span>Mật khẩu</span>
            <span className="password-field">
              <input
                className={`form-input ${error ? "form-input--error" : ""}`}
                type={show ? "text" : "password"}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShow((v) => !v)}
                aria-pressed={show}
                aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {show ? "🙈 Ẩn" : "👁 Hiện"}
              </button>
            </span>
          </label>
          {error && (
            <div className="callout callout--error" role="alert">
              ⚠️ {error}
            </div>
          )}
          <button className="btn interactive" type="submit" disabled={busy || !password}>
            {busy ? "⏳ Đang vào…" : "🔑 Vào quản lý"}
          </button>
        </form>
      </div>
    </main>
  );
}
