import { formatPrice } from "@/data/combos";

const products = [
  { id: "keo", name: "Keo nối mi", desc: "Khô nhanh, ít kích ứng, giữ mi lâu.", price: 90000, icon: "🧴", color: "blue" },
  { id: "serum", name: "Serum dưỡng mi", desc: "Dưỡng mi tự nhiên, giúp mi chắc khỏe.", price: 120000, icon: "💧", color: "green" },
  { id: "chai", name: "Chổi chải mi", desc: "Chải mi mỗi ngày cho mi luôn vào nếp.", price: 30000, icon: "🪮", color: "pink" },
  { id: "tay-trang", name: "Nước tẩy trang mắt", desc: "Dịu nhẹ, không dầu, an toàn cho mi nối.", price: 110000, icon: "🫧", color: "yellow" },
] as const;

export default function ShoppingPage() {
  return (
    <main className="container section">
      <span className="badge-tilt">Shopping</span>
      <h1 style={{ marginTop: 24 }}>Đồ chăm mi</h1>
      <p className="subtitle">— giữ mi đẹp lâu hơn</p>
      <p className="muted" style={{ marginTop: 12 }}>
        Mua tại tiệm — xem giá — hỏi <span className="hl">linhhue</span> qua Zalo.
      </p>

      <ul className="combo-grid" style={{ listStyle: "none", padding: 0 }}>
        {products.map((p) => (
          <li key={p.id} className="card combo-card interactive">
            <div className="combo-card__img product-tile" style={{ background: `var(--${p.color})` }}>
              <span aria-hidden="true">{p.icon}</span>
            </div>
            <div className="combo-card__body">
              <h2 className="combo-card__name">{p.name}</h2>
              <p className="combo-card__desc">{p.desc}</p>
              <div className="combo-card__meta">
                <span className="pill pill--yellow">💰 {formatPrice(p.price)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
