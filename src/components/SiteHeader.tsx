"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navItems, shop } from "@/data/shop";

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
        </nav>
      </div>
    </header>
  );
}
