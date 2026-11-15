import Link from "next/link";

/** Hai trang quản lý lịch: đang chờ / đã xong & đã hủy. */
export default function AdminTabs({ current }: { current: "active" | "history" | "blocks" }) {
  return (
    <div className="admin-tabs" role="tablist" aria-label="Các trang lịch">
      <Link
        href="/admin"
        role="tab"
        aria-selected={current === "active"}
        className={`pill interactive${current === "active" ? " pill--blue" : " pill--white"}`}
      >
        🗓️ Đang chờ
      </Link>
      <Link
        href="/admin/lich-su"
        role="tab"
        aria-selected={current === "history"}
        className={`pill interactive${current === "history" ? " pill--blue" : " pill--white"}`}
      >
        ✅ Đã xong
      </Link>
      <Link
        href="/admin/lich-nghi"
        role="tab"
        aria-selected={current === "blocks"}
        className={`pill interactive${current === "blocks" ? " pill--blue" : " pill--white"}`}
      >
        ⛔ Lịch nghỉ
      </Link>
    </div>
  );
}
