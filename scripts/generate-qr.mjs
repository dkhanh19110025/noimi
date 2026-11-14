import QRCode from "qrcode";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { networkInterfaces } from "node:os";

// Đọc SITE_URL từ môi trường, hoặc từ file .env nếu có
function loadEnvFile() {
  if (!existsSync(".env")) return {};
  const out = {};
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

function lanIp() {
  for (const list of Object.values(networkInterfaces())) {
    for (const i of list ?? []) {
      if (i.family === "IPv4" && !i.internal && i.address.startsWith("192.168.")) return i.address;
    }
  }
  return null;
}

const env = { ...loadEnvFile(), ...process.env };
let site = env.SITE_URL;
if (!site) {
  const ip = lanIp();
  if (!ip) {
    console.error("Thiếu SITE_URL và không tìm thấy địa chỉ LAN. Đặt SITE_URL=https://ten-mien.com");
    process.exit(1);
  }
  site = `http://${ip}:3000`;
  console.log(`(Không có SITE_URL, dùng địa chỉ LAN: ${site})`);
}

const url = `${site.replace(/\/+$/, "")}/dat-lich?src=qr`;
const opts = {
  errorCorrectionLevel: "M",
  margin: 4, // vùng trống tối thiểu 4 ô
  color: { dark: "#000000", light: "#ffffff" },
};

mkdirSync("qr", { recursive: true });
await QRCode.toFile("qr/dat-lich.png", url, { ...opts, width: 1024 });
await QRCode.toFile("qr/dat-lich.svg", url, { ...opts, type: "svg" });

console.log(`Đã tạo QR trỏ tới: ${url}`);
console.log("  qr/dat-lich.png (1024x1024)");
console.log("  qr/dat-lich.svg");
