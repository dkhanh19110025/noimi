import type { Metadata } from "next";
import Link from "next/link";
import { shop } from "@/data/shop";

export const metadata: Metadata = { title: "Chăm sóc sau khi làm mi — Linh Hue Facial & Lash" };

// Hướng dẫn chung — chủ tiệm cần đọc lại và sửa theo loại keo, thuốc tiệm đang dùng.
const GUIDES = [
  {
    title: "👁️ Sau khi nối mi",
    color: "pink",
    tips: [
      "Tránh để mi dính nước, xông hơi trong 24 giờ đầu.",
      "Không dụi mắt, không tự giật mi.",
      "Dùng tẩy trang không dầu cho vùng mắt.",
      "Chải mi nhẹ mỗi ngày, hạn chế nằm úp mặt.",
    ],
  },
  {
    title: "🌀 Sau khi uốn mi",
    color: "blue",
    tips: [
      "Giữ mi khô trong 24 giờ đầu.",
      "Chưa chuốt mascara, chưa dùng kẹp mi trong 24 giờ.",
      "Không dụi mắt.",
      "Có thể thoa serum dưỡng mi từ ngày hôm sau.",
    ],
  },
];

export default function CarePage() {
  return (
    <main className="container section">
      <span className="badge-tilt">Chăm sóc</span>
      <h1 style={{ marginTop: 24 }}>Giữ mi đẹp lâu</h1>
      <p className="subtitle">— nhẹ tay, giữ khô, dưỡng đều</p>

      <div className="combo-grid">
        {GUIDES.map((g) => (
          <section key={g.title} className="card" style={{ background: `var(--${g.color})` }}>
            <h2>{g.title}</h2>
            <ul style={{ marginTop: 12, paddingLeft: 20 }}>
              {g.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="callout" style={{ marginTop: 24 }}>
        ⚠️ Nếu mắt đỏ, sưng, ngứa hoặc đau: liên hệ tiệm ({shop.phone}) và đi khám.
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
        <Link href="/dat-lich" className="btn btn--blue interactive">📅 Đặt lịch</Link>
        <Link href="/shopping" className="btn btn--white interactive">🛍️ Đồ chăm mi</Link>
      </div>
    </main>
  );
}
