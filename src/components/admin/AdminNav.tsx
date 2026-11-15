"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/** Menu thanh quản lý: ba nút cùng cỡ, trang đang mở được tô vàng. */
export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const onPassword = pathname.startsWith("/admin/mat-khau");
  const onFeedback = pathname.startsWith("/admin/phan-hoi");
  const onSchedule = !onPassword && !onFeedback;

  return (
    <nav className="admin-bar__nav" aria-label="Menu quản lý">
      <Link
        href="/admin"
        className={`admin-bar__link${onSchedule ? " is-active" : ""}`}
        aria-current={onSchedule ? "page" : undefined}
      >
        📅<span>Lịch</span>
      </Link>
      <Link
        href="/admin/phan-hoi"
        className={`admin-bar__link${onFeedback ? " is-active" : ""}`}
        aria-current={onFeedback ? "page" : undefined}
      >
        💬<span className="admin-bar__label">Phản hồi</span>
      </Link>
      <Link
        href="/admin/mat-khau"
        className={`admin-bar__link${onPassword ? " is-active" : ""}`}
        aria-label="Đổi mật khẩu"
        aria-current={onPassword ? "page" : undefined}
      >
        🔒<span className="admin-bar__label">Mật khẩu</span>
      </Link>
      <button
        type="button"
        className="admin-bar__link"
        onClick={async () => {
          await fetch("/api/admin/logout", { method: "POST" });
          router.replace("/admin/login");
          router.refresh();
        }}
      >
        ↩<span>Thoát</span>
      </button>
    </nav>
  );
}
