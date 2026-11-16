import CartView from "@/components/shop/CartView";

export default function CartPage() {
  return (
    <main className="container section">
      <span className="badge-tilt">Giỏ hàng</span>
      <h1 style={{ marginTop: 24 }}>Giỏ của bạn</h1>
      <p className="subtitle">— xem lại rồi đặt hàng</p>
      <CartView />
    </main>
  );
}
