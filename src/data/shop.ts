export const shop = {
  name: "Linh Hue Facial & Lash",
  address: "Nguyễn Văn Khối, Phường 8, Gò Vấp, TP.HCM",
  /** Tọa độ tiệm: bấm "Xem trên Google Maps" sẽ ghim đúng điểm này */
  lat: 10.84331,
  lng: 106.6463,
  googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=10.84331,106.6463",
  /** Số Zalo của tiệm (dùng cho deep link) */
  zaloPhone: "0865536573",
  phone: "0865536573",
};

/** Các trang thuộc khu Shopping: chỉ ở đây mới hiện giỏ hàng, yêu thích và tài khoản mua hàng. */
export function isShopPath(pathname: string): boolean {
  return ["/shopping", "/gio-hang", "/yeu-thich", "/ho-so", "/dang-nhap", "/dang-ky"].some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export const navItems = [
  { href: "/dat-lich", label: "Đặt lịch", icon: "📅" },
  { href: "/shopping", label: "Shopping", icon: "🛍️" },
];
