import type { Metadata } from "next";
import Link from "next/link";
import { isAdmin } from "@/lib/admin-auth";
import AdminNav from "@/components/admin/AdminNav";
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
          {loggedIn && <AdminNav />}
        </div>
      </header>
      {children}
    </div>
  );
}
