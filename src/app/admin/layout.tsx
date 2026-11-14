import type { Metadata } from "next";
import Link from "next/link";
import { isAdmin } from "@/lib/admin-auth";
import LogoutButton from "@/components/admin/LogoutButton";
import { shop } from "@/data/shop";

export const metadata: Metadata = {
  title: `Quản lý · ${shop.name}`,
  robots: { index: false, follow: false },
  manifest: "/admin.webmanifest",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const loggedIn = await isAdmin();

  return (
    <div className="admin-shell">
      <header className="admin-bar">
        <div className="container admin-bar__inner">
          <Link href="/admin" className="admin-bar__name">
            🗂️ {shop.name}
            <span className="admin-bar__label">&nbsp;· quản lý</span>
          </Link>
          {loggedIn && (
            <nav className="admin-bar__nav" aria-label="Menu quản lý">
              <Link href="/admin" className="admin-bar__link">Lịch</Link>
              <Link href="/admin/mat-khau" className="admin-bar__link admin-bar__link--plain" aria-label="Đổi mật khẩu">
                🔒
                <span className="admin-bar__label">Mật khẩu</span>
              </Link>
              <LogoutButton />
            </nav>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}
