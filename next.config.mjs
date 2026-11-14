/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cho phép điện thoại cùng Wi-Fi mở trang khi chạy dev
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  // Tắt logo / indicator của Next.js khi chạy chế độ dev
  devIndicators: false,
};
export default nextConfig;
