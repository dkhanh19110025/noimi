/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cho phép điện thoại cùng Wi-Fi mở trang khi chạy dev
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
};
export default nextConfig;
