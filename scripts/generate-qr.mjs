// Tạo mã QR.
//   npm run qr                 → QR đặt lịch cho khách (dùng SITE_URL)
//   npm run qr:admin           → QR vào trang quản lý (dùng SITE_URL)
//   thêm --local               → trỏ về máy đang chạy dev (địa chỉ Wi-Fi:3001), để thử trên điện thoại
import QRCode from "qrcode";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { networkInterfaces } from "node:os";

const args = new Set(process.argv.slice(2));
const isAdmin = args.has("--admin");
const isLocal = args.has("--local");
const LOCAL_PORT = 3001;

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
let site;
if (isLocal) {
  const ip = lanIp();
  if (!ip) {
    console.error("Không tìm thấy địa chỉ Wi-Fi/LAN của máy này.");
    process.exit(1);
  }
  site = `http://${ip}:${LOCAL_PORT}`;
} else {
  site = env.SITE_URL;
  if (!site) {
    console.error("Thiếu SITE_URL. Đặt SITE_URL=https://ten-mien.com trong .env");
    process.exit(1);
  }
}

const path = isAdmin ? "/admin" : "/dat-lich?src=qr";
const url = `${site.replace(/\/+$/, "")}${path}`;
const name = `${isAdmin ? "admin" : "dat-lich"}${isLocal ? "-local" : ""}`;

const opts = {
  errorCorrectionLevel: "M",
  margin: 4, // vùng trống tối thiểu 4 ô
  color: { dark: "#000000", light: "#ffffff" },
};

mkdirSync("qr", { recursive: true });
await QRCode.toFile(`qr/${name}.png`, url, { ...opts, width: 1024 });
await QRCode.toFile(`qr/${name}.svg`, url, { ...opts, type: "svg" });

console.log(`Đã tạo QR trỏ tới: ${url}`);
console.log(`  qr/${name}.png (1024x1024)`);
console.log(`  qr/${name}.svg`);
