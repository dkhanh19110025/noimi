// Chatbot tư vấn dịch vụ của tiệm theo từ khóa (không tư vấn hàng ở trang Shopping).
// Hàm thuần: dữ liệu (dịch vụ, tiệm) được truyền vào.

import { COUPONS, LOYALTY } from "./discount.ts"; // đuôi .ts để node chạy thẳng file test

export type BotContext = {
  services: { name: string; price: number; originalPrice?: number }[];
  shop: { address: string; phone: string; googleMapsUrl: string };
  sessions: { label: string; range: string }[];
};

/** href "zalo" = mở khung Zalo ngay tại trang */
export type BotLink = { label: string; href: string };
export type BotReply = { text: string; links?: BotLink[] };

export const QUICK_QUESTIONS = ["Combo nào rẻ?", "Cách đặt lịch", "Mã giảm giá", "Tiệm ở đâu?"];

/** Chữ thường, bỏ dấu, bỏ ký tự lạ → khách gõ có dấu hay không dấu đều hiểu */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/(\d)[.,](?=\d{3})/g, "$1")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Có một trong các cụm từ (khớp nguyên từ) */
function has(text: string, ...phrases: string[]): boolean {
  return phrases.some((p) => ` ${text} `.includes(` ${p} `));
}

/** "dưới 100k", "tầm 150 nghìn", "khoảng 1 triệu" → số tiền (đồng) */
export function parseBudget(text: string): number | null {
  const m = text.match(/\b(duoi|tam|khoang|toi da) (\d+) ?(k|nghin|ngan|tr|trieu|d|dong)?\b/);
  if (!m) return null;
  const n = Number(m[2]);
  if (m[3] === "tr" || m[3] === "trieu") return n * 1_000_000;
  return n < 1000 ? n * 1000 : n;
}

const money = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

const BOOK_LINK: BotLink = { label: "📅 Đặt lịch", href: "/dat-lich" };
const ZALO_LINK: BotLink = { label: "💬 Nhắn Zalo", href: "zalo" };

/** Từ khóa nhận ra từng dịch vụ (đã bỏ dấu) */
const SERVICE_WORDS: Record<string, string[]> = {
  "uon mi": ["uon mi"],
  "noi mi": ["noi mi"],
  "cham soc da": ["cham soc da", "lan da", "da mat"],
};

function cheapest(ctx: BotContext, budget: number | null): BotReply {
  const priced = ctx.services.filter((s) => s.price > 0 && (budget === null || s.price <= budget));
  priced.sort((a, b) => a.price - b.price);
  if (!priced.length) {
    const text = ctx.services.every((s) => s.price <= 0)
      ? "Tiệm chưa niêm yết giá combo dịch vụ trên web, bạn nhắn Zalo để được báo giá nhé."
      : `Chưa có dịch vụ nào trong tầm ${money(budget!)}.`;
    return { text, links: [ZALO_LINK] };
  }
  const lines = [`💸 Dịch vụ rẻ nhất: ${priced[0].name} — ${money(priced[0].price)}.`];
  const bundle = priced.find((s) => s.originalPrice);
  if (bundle) {
    lines.push(`🎁 Combo tiết kiệm rẻ nhất: ${bundle.name} — ${money(bundle.price)} (bớt ${money(bundle.originalPrice! - bundle.price)}).`);
  }
  return { text: lines.join("\n"), links: [BOOK_LINK] };
}

export function reply(message: string, ctx: BotContext): BotReply {
  const t = normalize(message);

  // Sức khỏe: không tư vấn tự động
  if (has(t, "di ung", "ngua", "sung", "do mat", "dau mat", "rat", "viem", "mang thai", "co bau")) {
    return {
      text: `Chuyện sức khỏe mắt, da mình không tư vấn được. Bạn liên hệ tiệm (${ctx.shop.phone}) trước khi làm; nếu đang sưng, đau thì nên đi khám.`,
      links: [ZALO_LINK],
    };
  }
  if (has(t, "huy", "doi lich", "doi gio", "doi ngay")) {
    return {
      text: "Lịch hẹn: bạn nhắn Zalo cho tiệm kèm mã lịch để hủy hoặc đổi.",
      links: [ZALO_LINK],
    };
  }

  if (has(t, "sau khi", "sau noi", "sau uon", "sau lam", "kieng", "giu mi", "cham soc mi", "cach cham soc")) {
    return {
      text: "🌿 Cách chăm sóc sau khi làm mi, bạn nhắn Zalo để tiệm hướng dẫn nhé.",
      links: [ZALO_LINK],
    };
  }
  if (has(t, "giam gia", "ma giam", "khuyen mai", "uu dai", "tich diem", "voucher")) {
    return {
      text: [
        ...Object.entries(COUPONS).map(([code, c]) => `• Mã ${code}: giảm ${c.percent}% khi đặt bất kỳ combo nào`),
        `• Tích điểm: đủ ${LOYALTY.every} lần làm xong, lần kế tiếp giảm ${LOYALTY.percent}% (tự trừ khi đặt lịch)`,
        "Mỗi lần chỉ áp dụng một ưu đãi cao nhất.",
      ].join("\n"),
      links: [BOOK_LINK],
    };
  }

  const budget = parseBudget(t);
  if (budget !== null || has(t, "re", "re nhat", "gia re", "tiet kiem", "it tien", "gia thap", "hat de")) {
    return cheapest(ctx, budget);
  }

  if (has(t, "gio mo cua", "mo cua", "may gio", "gio lam", "dong cua", "gio nao")) {
    return {
      text: `🕒 Tiệm nhận lịch:\n${ctx.sessions.map((s) => `• ${s.label}: ${s.range}`).join("\n")}`,
      links: [BOOK_LINK],
    };
  }
  if (has(t, "o dau", "dia chi", "ban do", "cho nao", "toi tiem", "den tiem")) {
    return {
      text: `📍 Tiệm ở ${ctx.shop.address}.`,
      links: [{ label: "🗺️ Google Maps", href: ctx.shop.googleMapsUrl }],
    };
  }
  if (has(t, "so dien thoai", "sdt", "zalo", "lien he", "hotline", "goi tiem")) {
    return { text: `📞 Số điện thoại và Zalo của tiệm: ${ctx.shop.phone}`, links: [ZALO_LINK] };
  }
  if (has(t, "dat lich", "dat hen", "hen lich", "lich hen", "book")) {
    return {
      text: "📅 Cách đặt lịch:\n1. Chọn combo dịch vụ\n2. Chọn ngày\n3. Chọn giờ còn trống\n4. Nhập thông tin rồi bấm Xác nhận đặt lịch",
      links: [BOOK_LINK],
    };
  }
  const asked = ctx.services.filter((s) => {
    const key = normalize(s.name);
    return has(t, ...(SERVICE_WORDS[key] ?? [key]));
  });
  if (asked.length || has(t, "combo", "dich vu", "bang gia", "gia", "bao nhieu")) {
    const list = asked.length ? asked : ctx.services;
    return {
      text: list.map((s) => `• ${s.name}: ${s.price > 0 ? money(s.price) : "nhắn Zalo để được báo giá"}`).join("\n"),
      links: [BOOK_LINK, ZALO_LINK],
    };
  }
  if (has(t, "chao", "hello", "hi", "alo", "shop oi")) {
    return { text: "Chào bạn 👋 Mình giúp chọn combo làm đẹp và hướng dẫn đặt lịch." };
  }
  return {
    text: "Mình chưa hiểu ý bạn. Bạn thử hỏi “combo nào rẻ”, “cách đặt lịch”, “địa chỉ”… hoặc nhắn Zalo cho tiệm.",
    links: [ZALO_LINK],
  };
}
