"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const ITEMS = [
  { href: "/admin", icon: "📅", label: "Lịch", exact: true },
  { href: "/admin/san-pham", icon: "🛍️", label: "Sản phẩm" },
  { href: "/admin/don-hang", icon: "📦", label: "Đơn hàng" },
  { href: "/admin/tai-khoan", icon: "👥", label: "Tài khoản" },
  { href: "/admin/phan-hoi", icon: "💬", label: "Phản hồi" },
  { href: "/admin/mat-khau", icon: "🔒", label: "Mật khẩu" },
] as const;

/**
 * Menu thanh quản lý. Điện thoại: lưới 4 cột, mỗi ô biểu tượng + chữ (không ẩn chữ, không phải đoán nút).
 * Máy tính: một hàng nút. Trang đang mở được tô vàng.
 */
export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  // "Lịch" gồm cả các trang con của lịch (lich, lich-su, lich-nghi, lich/[id])
  const section = ITEMS.filter((i) => !("exact" in i)).find((i) => pathname.startsWith(i.href))?.href ?? "/admin";

  return (
    <nav className="admin-bar__nav" aria-label="Menu quản lý">
      {ITEMS.map((item) => {
        const active = section === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`admin-bar__link${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="admin-bar__icon" aria-hidden="true">{item.icon}</span>
            <span className="admin-bar__text">{item.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        className="admin-bar__link"
        onClick={async () => {
          await fetch("/api/admin/logout", { method: "POST" });
          router.replace("/admin/login");
          router.refresh();
        }}
      >
        <span className="admin-bar__icon" aria-hidden="true">↩</span>
        <span className="admin-bar__text">Thoát</span>
      </button>
    </nav>
  );
}
