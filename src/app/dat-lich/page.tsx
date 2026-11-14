import { combos, formatDuration, formatPrice } from "@/data/combos";

export default function BookingPage() {
  return (
    <main className="container section">
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span className="badge-tilt">Đặt lịch nối mi</span>
        <span className="pill pill--blue">Bước 1/4</span>
      </div>

      <h1 style={{ marginTop: 24 }}>Chọn combo</h1>
      <p className="subtitle">— mi xinh trong vài phút</p>
      <p className="muted" style={{ marginTop: 12 }}>
        Chọn kiểu <span className="hl">bạn thích</span> — xem giá — xem thời gian.
      </p>

      <ul className="combo-grid" style={{ listStyle: "none", padding: 0 }}>
        {combos.map((c) => (
          <li key={c.id} className="card combo-card interactive">
            <div className="combo-card__img" style={{ background: `var(--${c.color})` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.imageUrl} alt={`Hình mẫu ${c.name}`} width={400} height={300} />
            </div>
            <div className="combo-card__body">
              <h2 className="combo-card__name">{c.name}</h2>
              <p className="combo-card__desc">{c.description}</p>
              <div className="combo-card__meta">
                <span className="pill pill--yellow">💰 {formatPrice(c.price)}</span>
                <span className="pill pill--green">⏱ {formatDuration(c.durationMinutes)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="callout" style={{ marginTop: 40 }}>
        📌 Bản demo: mới xem được danh sách combo. Chọn ngày và giờ sẽ có ở bước sau.
      </p>
    </main>
  );
}
