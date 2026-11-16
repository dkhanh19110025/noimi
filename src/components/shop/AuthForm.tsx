"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { safeNext } from "@/lib/next-url";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const reg = mode === "register";
  // Trang tĩnh (lưu sẵn trên CDN): đọc ?next= và kiểm tra đã đăng nhập chưa ở phía trình duyệt
  const [next, setNext] = useState("/ho-so");
  useEffect(() => {
    const n = safeNext(new URLSearchParams(location.search).get("next") ?? undefined);
    setNext(n);
    fetch("/api/shop/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => j.user && location.replace(n))
      .catch(() => {});
  }, []);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/shop/${reg ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reg ? { name, phone, email, password } : { phone, password }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok) {
        window.location.replace(next);
        return;
      }
      setError(json?.error ?? "Không thực hiện được.");
    } catch {
      setError("Không kết nối được server. Vui lòng thử lại.");
    }
    setBusy(false);
  }

  const q = next !== "/ho-so" ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <div className="card admin-login">
      <span className="badge-tilt">{reg ? "Tạo tài khoản" : "Chào bạn quay lại"}</span>
      <h1 style={{ marginTop: 20, fontSize: "clamp(2rem, 8vw, 2.8rem)" }}>{reg ? "Đăng ký" : "Đăng nhập"}</h1>
      <p className="muted" style={{ marginTop: 8 }}>
        {reg ? "Email dùng để gửi xác nhận đơn hàng cho bạn." : "Dùng số điện thoại và mật khẩu của bạn."}
      </p>

      <form onSubmit={submit} className="booking-form" style={{ marginTop: 20 }}>
        {reg && (
          <label className="form-label">
            <span>Tên của bạn <span className="form-required">*</span></span>
            <input className="form-input" type="text" required maxLength={60} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label className="form-label">
          <span>Số điện thoại <span className="form-required">*</span></span>
          <input className="form-input" type="tel" inputMode="numeric" required pattern="0[0-9]{9}" title="10 chữ số, bắt đầu bằng 0" maxLength={10} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />
        </label>
        {reg && (
          <label className="form-label">
            <span>Email <span className="form-required">*</span></span>
            <input className="form-input" type="email" required maxLength={120} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        )}
        <label className="form-label">
          <span>Mật khẩu {reg && <span className="muted">(từ 6 ký tự)</span>}</span>
          <span className="password-field">
            <input
              className={`form-input ${error ? "form-input--error" : ""}`}
              type={show ? "text" : "password"}
              required
              minLength={reg ? 6 : 1}
              autoComplete={reg ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="password-toggle" onClick={() => setShow((v) => !v)}>
              {show ? "Ẩn" : "Hiện"}
            </button>
          </span>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn--blue interactive" disabled={busy}>
          {busy ? "Đang xử lý…" : reg ? "Tạo tài khoản" : "Đăng nhập"}
        </button>
      </form>

      <p className="muted" style={{ marginTop: 16 }}>
        {reg ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
        <Link href={`${reg ? "/dang-nhap" : "/dang-ky"}${q}`} className="hl">
          {reg ? "Đăng nhập" : "Đăng ký"}
        </Link>
      </p>
    </div>
  );
}
