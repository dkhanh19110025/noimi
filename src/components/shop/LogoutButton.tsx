"use client";

import { useShop } from "./ShopProvider";

export default function LogoutButton() {
  const { logout } = useShop();
  return (
    <button type="button" className="btn btn--white interactive" onClick={logout}>
      ↩ Đăng xuất
    </button>
  );
}
