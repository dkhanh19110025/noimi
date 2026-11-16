/** Khung chờ hiện tức thì khi chuyển trang (trang thật còn đang tải dữ liệu). */
export default function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <main className="container section" aria-busy="true" aria-label="Đang tải">
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--line" />
      <ul className="admin-list" style={{ listStyle: "none", padding: 0 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="card">
            <div className="skeleton skeleton--line" style={{ width: "40%" }} />
            <div className="skeleton skeleton--line" />
            <div className="skeleton skeleton--line" style={{ width: "70%" }} />
          </li>
        ))}
      </ul>
    </main>
  );
}
