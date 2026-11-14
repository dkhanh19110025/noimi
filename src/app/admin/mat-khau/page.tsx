"use client";

import Link from "next/link";
import { useState } from "react";

const MIN = 10;

export default function ChangePasswordPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone(false);

    if (next.length < MIN) return setError(`Mật khẩu mới cần ít nhất ${MIN} ký tự.`);
    if (next !== again) return setError("Hai lần nhập mật khẩu mới không giống nhau.");
    if (next === current) return setError("Mật khẩu mới phải khác mật khẩu hiện tại.");

    setBusy(true);
    try {
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      if (res.ok) {
        setDone(true);
        setCurrent("");
        setNext("");
        setAgain("");
        return;
      }
      const json = await res.json().catch(() => null);
      setError(json?.error?.message ?? "Không đổi được mật khẩu.");
    } catch {
      setError("Không kết nối được server. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container section admin-main">
      <Link href="/admin" className="btn btn--white interactive">
        ← Về lịch
      </Link>

      <div className="card admin-login" style={{ marginTop: 20 }}>
        <h1>Đổi mật khẩu</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Đổi xong, các điện thoại khác đang đăng nhập sẽ bị thoát và phải nhập mật khẩu mới.
        </p>

        <form onSubmit={submit} className="booking-form" style={{ marginTop: 20 }}>
          <label className="form-label">
            <span>Mật khẩu hiện tại</span>
            <input
              className="form-input"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>

          <label className="form-label">
            <span>Mật khẩu mới (ít nhất {MIN} ký tự)</span>
            <input
              className="form-input"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </label>

          <label className="form-label">
            <span>Nhập lại mật khẩu mới</span>
            <input
              className="form-input"
              type="password"
              autoComplete="new-password"
              value={again}
              onChange={(e) => setAgain(e.target.value)}
            />
          </label>

          {error && (
            <div className="callout callout--error" role="alert">
              ⚠️ {error}
            </div>
          )}
          {done && (
            <div className="callout" role="status">
              ✅ Đã đổi mật khẩu. Máy này vẫn đang đăng nhập.
            </div>
          )}

          <button
            className="btn interactive"
            type="submit"
            disabled={busy || !current || !next || !again}
          >
            {busy ? "⏳ Đang lưu…" : "🔒 Đổi mật khẩu"}
          </button>
        </form>
      </div>
    </main>
  );
}
