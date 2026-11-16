"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navItems, shop } from "@/data/shop";
import { useShop } from "@/components/shop/ShopProvider";

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, displayName, favs } = useShop();

  // Trang quản lý có thanh riêng, không hiện menu của khách
  if (pathname.startsWith("/admin")) return null;

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/dat-lich" className="site-header__name" onClick={() => setOpen(false)}>
          ✨ {shop.name}
        </Link>

        <button
          type="button"
          className="btn btn--white nav-toggle"
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Đóng" : "Menu"}
        </button>

        <nav id="main-nav" className={`nav${open ? " nav--open" : ""}`} aria-label="Menu chính">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav__link${active ? " nav__link--active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <span aria-hidden="true">{item.icon}</span> {item.label}
              </Link>
            );
          })}
          {[
            { href: "/yeu-thich", icon: "❤️", label: "Yêu thích", count: favs.length },
            user || displayName
              ? { href: "/ho-so", icon: "👤", label: (user?.name ?? displayName ?? "").split(" ").pop() || "Hồ sơ", count: 0 }
              : { href: "/dang-nhap", icon: "👤", label: "Đăng nhập", count: 0 },
          ].map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav__link${active ? " nav__link--active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <span aria-hidden="true">{item.icon}</span> {item.label}
                {item.count > 0 && <span className="nav__badge" aria-label={`${item.count} món`}>{item.count}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
