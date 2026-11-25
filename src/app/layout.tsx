import type { Metadata, Viewport } from "next";
import { Itim, JetBrains_Mono, Patrick_Hand } from "next/font/google";
import ChatBot from "@/components/ChatBot";
import SiteHeader from "@/components/SiteHeader";
import ZaloFloat from "@/components/ZaloFloat";
import CartFloat from "@/components/shop/CartFloat";
import { ShopProvider } from "@/components/shop/ShopProvider";
import { shop } from "@/data/shop";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/components.css";

// Font tự host cùng tên miền (không kết nối tới Google khi khách quét QR), có đủ tiếng Việt.
const body = Patrick_Hand({ weight: "400", subsets: ["latin", "vietnamese"], display: "swap", variable: "--nf-body" });
const display = Itim({ weight: "400", subsets: ["latin", "vietnamese"], display: "swap", variable: "--nf-display" });
const mono = JetBrains_Mono({ weight: ["400", "600"], subsets: ["latin"], display: "swap", variable: "--nf-mono" });

export const metadata: Metadata = {
  title: "Linh Hue Facial & Lash",
  description: "Chọn dịch vụ, chọn giờ, đặt lịch uốn mi, nối mi, chăm sóc da trong vài bước.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Layout không đọc cookie → các trang khách được lưu sẵn trên CDN, quét QR là mở gần như tức thì.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${body.variable} ${display.variable} ${mono.variable}`}>
      <body>
        <ShopProvider>
          <SiteHeader />
          {children}
          <footer className="container">
            <p className="footer-line">{shop.name}</p>
          </footer>
          <CartFloat />
          <ZaloFloat />
          <ChatBot />
        </ShopProvider>
      </body>
    </html>
  );
}
