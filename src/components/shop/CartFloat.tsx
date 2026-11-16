"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShop } from "./ShopProvider";

/** Nút giỏ hàng nổi, nằm ngay trên nút Zalo để khách bấm được ở mọi trang. */
export default function CartFloat() {
  const pathname = usePathname();
  const { cartCount } = useShop();
  if (pathname.startsWith("/admin") || pathname === "/gio-hang") return null;

  return (
    <Link
      href="/gio-hang"
      className="cart-float interactive"
      aria-label={cartCount > 0 ? `Giỏ hàng, ${cartCount} món` : "Giỏ hàng"}
    >
      <span aria-hidden="true">🛒</span> Giỏ hàng
      {cartCount > 0 && <span className="nav__badge">{cartCount}</span>}
    </Link>
  );
}
