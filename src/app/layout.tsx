import type { Metadata, Viewport } from "next";
import SiteHeader from "@/components/SiteHeader";
import { shop } from "@/data/shop";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/components.css";

export const metadata: Metadata = {
  title: "linhhue · Nối mi",
  description: "Chọn combo, chọn giờ, đặt lịch nối mi trong vài bước.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Itim&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SiteHeader />
        {children}
        <footer className="container">
          <p className="footer-line">{shop.name} · {shop.tagline}</p>
        </footer>
      </body>
    </html>
  );
}
