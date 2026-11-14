const reviews = [
  { id: 1, name: "Khách A", stars: 5, text: "Mi nhẹ, tự nhiên, ngồi làm thoải mái.", color: "blue" },
  { id: 2, name: "Khách B", stars: 5, text: "Đặt lịch nhanh, đến là được làm liền.", color: "pink" },
  { id: 3, name: "Khách C", stars: 4, text: "Mi giữ được lâu, sẽ quay lại.", color: "green" },
] as const;

export default function ReviewsPage() {
  return (
    <main className="container section">
      <span className="badge-tilt">Đánh giá</span>
      <h1 style={{ marginTop: 24 }}>Khách nói gì</h1>
      <p className="subtitle">— lời thật từ khách của tiệm</p>

      <p className="callout" style={{ marginTop: 24 }}>
        📌 Bản demo: các đánh giá bên dưới là <strong>nội dung mẫu để xem bố cục</strong>, không phải của khách thật.
        Sẽ thay bằng đánh giá thật của tiệm.
      </p>

      <ul className="combo-grid" style={{ listStyle: "none", padding: 0 }}>
        {reviews.map((r) => (
          <li key={r.id} className="card review-card" style={{ background: `var(--${r.color})` }}>
            <p aria-label={`${r.stars} trên 5 sao`}>
              {"★".repeat(r.stars)}
              {"☆".repeat(5 - r.stars)}
            </p>
            <p>“{r.text}”</p>
            <p className="muted">— {r.name} (mẫu)</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
