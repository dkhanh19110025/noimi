"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/data/combos";
import { ProductTile } from "./ProductCard";
import { useShop, type Product } from "./ShopProvider";

export default function CartView() {
  const { user, ready, cart, setQty, removeFromCart, clearCart } = useShop();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ code: string; mailed: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/shop/products")
      .then((r) => r.json())
      .then((j) => setProducts(j.products ?? []))
      .catch(() => setProducts([]));
  }, []);

  if (done) {
    return (
      <div className="card" style={{ marginTop: 24 }}>
        <h2>🎉 Đặt hàng thành công</h2>
        <p style={{ marginTop: 8 }}>Mã đơn: <b>{done.code}</b></p>
        <p className="muted" style={{ marginTop: 8 }}>
          {done.mailed
            ? "Email xác nhận đang được gửi cho bạn."
            : "Đơn đã được ghi nhận (hiện chưa gửi được email xác nhận)."}{" "}
          Bạn nhận hàng và thanh toán tại tiệm.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
          <Link href="/ho-so" className="btn btn--blue interactive">📦 Xem đơn của tôi</Link>
          <Link href="/shopping" className="btn btn--white interactive">Mua thêm</Link>
        </div>
      </div>
    );
  }

  if (!ready || products === null) return <p className="muted" style={{ marginTop: 24 }}>Đang tải giỏ hàng…</p>;

  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ p: products.find((x) => x.id === id), id, qty }))
    .filter((l): l is { p: Product; id: string; qty: number } => !!l.p);
  const total = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
  const problem = lines.find((l) => l.p.stock < l.qty);

  if (lines.length === 0) {
    return (
      <div className="callout" style={{ marginTop: 24 }}>
        🛒 Giỏ hàng đang trống. <Link href="/shopping" className="hl">Đi xem sản phẩm</Link>
      </div>
    );
  }

  async function order() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/shop/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines.map((l) => ({ product_id: l.id, qty: l.qty })), note }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok) {
        clearCart();
        setDone({ code: json.code, mailed: !!json.mailed });
      } else if (res.status === 401) {
        window.location.href = "/dang-nhap?next=/gio-hang";
        return;
      } else setError(json?.error ?? "Không đặt được hàng.");
    } catch {
      setError("Không kết nối được server. Vui lòng thử lại.");
    }
    setBusy(false);
  }

  return (
    <div style={{ marginTop: 24 }}>
      <ul className="admin-list" style={{ listStyle: "none", padding: 0 }}>
        {lines.map(({ p, qty }) => (
          <li key={p.id} className="card cart-line">
            <div className="cart-line__img"><ProductTile p={p} /></div>
            <div className="cart-line__body">
              <h2 className="combo-card__name">{p.name}</h2>
              <p className="muted">{formatPrice(p.price)} / cái</p>
              {p.stock < qty && (
                <p className="form-error">{p.stock > 0 ? `Chỉ còn ${p.stock} cái.` : "Đã hết hàng."} Hãy giảm số lượng.</p>
              )}
              <div className="qty">
                <button type="button" className="qty__btn" aria-label="Giảm" onClick={() => setQty(p.id, qty - 1)}>−</button>
                <span className="qty__num" aria-live="polite">{qty}</span>
                <button type="button" className="qty__btn" aria-label="Tăng" disabled={qty >= p.stock} onClick={() => setQty(p.id, qty + 1)}>+</button>
                <button type="button" className="btn btn--white interactive" onClick={() => removeFromCart(p.id)}>🗑️ Xóa</button>
              </div>
            </div>
            <strong className="cart-line__sum">{formatPrice(p.price * qty)}</strong>
          </li>
        ))}
      </ul>

      <div className="card" style={{ marginTop: 24 }}>
        <label className="form-label">
          <span>Ghi chú (không bắt buộc)</span>
          <textarea className="form-input form-textarea" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <p className="summary-row" style={{ marginTop: 16, fontSize: "1.3rem" }}>
          <span>Tổng cộng: </span><strong>{formatPrice(total)}</strong>
        </p>
        <p className="muted">Chưa thanh toán online — bạn nhận hàng và trả tiền tại tiệm.</p>
        {error && <p className="form-error" role="alert" style={{ marginTop: 8 }}>{error}</p>}
        {user ? (
          <button type="button" className="btn btn--blue interactive" style={{ marginTop: 16 }} disabled={busy || !!problem} onClick={order}>
            {busy ? "Đang đặt…" : "✅ Đặt hàng"}
          </button>
        ) : (
          <div style={{ marginTop: 16 }}>
            <div className="callout">🔐 Bạn cần đăng nhập để đặt hàng.</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
              <Link href="/dang-nhap?next=/gio-hang" className="btn btn--blue interactive">Đăng nhập</Link>
              <Link href="/dang-ky?next=/gio-hang" className="btn btn--white interactive">Đăng ký</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
