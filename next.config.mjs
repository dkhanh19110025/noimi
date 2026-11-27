/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cho phép build thử production ở thư mục riêng (không đè lên server dev đang chạy)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Cho phép điện thoại cùng Wi-Fi mở trang khi chạy dev
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  // Tắt logo / indicator của Next.js khi chạy chế độ dev
  devIndicators: false,
  // Cho phép form admin gửi ảnh sản phẩm tối đa 4 MB (mặc định chỉ 1 MB)
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
  async headers() {
    return [
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/api/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};
export default nextConfig;
