// Chatbot trả lời theo từ khóa. Hàm thuần: dữ liệu (sản phẩm, dịch vụ, tiệm) được truyền vào.

import { COUPONS, LOYALTY } from "./discount.ts"; // đuôi .ts để node chạy thẳng file test

export type BotProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  stock: number;
  avg_stars?: number | null;
  review_count?: number;
};

export type BotContext = {
  /** null = chưa tải được danh mục */
  products: BotProduct[] | null;
  services: { name: string; price: number; originalPrice?: number }[];
  shop: { address: string; phone: string; googleMapsUrl: string };
  sessions: { label: string; range: string }[];
};

/** href "zalo" = mở khung Zalo ngay tại trang */
export type BotLink = { label: string; href: string };
export type BotReply = { text: string; products?: BotProduct[]; links?: BotLink[] };

export const QUICK_QUESTIONS = ["Combo nào rẻ?", "Cách đặt lịch", "Mã giảm giá", "Chăm sóc mi", "Mua hàng ở đâu?"];

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

const SHOP_LINK: BotLink = { label: "🛍️ Xem sản phẩm", href: "/shopping" };
const BOOK_LINK: BotLink = { label: "📅 Đặt lịch", href: "/dat-lich" };
const ZALO_LINK: BotLink = { label: "💬 Nhắn Zalo", href: "zalo" };

/** Từ khóa nhận ra từng dịch vụ (đã bỏ dấu) */
const SERVICE_WORDS: Record<string, string[]> = {
  "uon mi": ["uon mi"],
  "noi mi": ["noi mi"],
  "cham soc da": ["cham soc da", "lan da", "da mat"],
};

/** Sản phẩm khách nhắc tên (vd. "serum", "kem chống nắng") */
function findByName(text: string, products: BotProduct[]): BotProduct[] {
  return products.filter((p) => {
    const words = normalize(p.name).split(" ");
    if (["keo", "serum", "guong", "choi"].includes(words[0]) && has(text, words[0])) return true;
    return words.slice(1).some((w, i) => {
      const pair = `${words[i]} ${w}`;
      return !(pair in SERVICE_WORDS) && has(text, pair);
    });
  });
}

/** Khách hỏi riêng đồ cho mi hoặc cho da thì chỉ lấy nhóm đó */
function byTopic(text: string, products: BotProduct[]): BotProduct[] {
  // So trên chữ còn dấu để "da" không lẫn với "đã", "đa"
  const word = has(text, "mi", "long mi") ? "mi" : has(text, "cho da", "duong da", "lan da", "da mat", "cham soc da") ? "da" : null;
  if (!word) return products;
  const re = new RegExp(`(^|[^\\p{L}])${word}([^\\p{L}]|$)`, "u");
  return products.filter((p) => re.test(`${p.name} ${p.description}`.toLowerCase().normalize("NFC")));
}

function cheapest(text: string, ctx: BotContext, budget: number | null): BotReply {
  const lines: string[] = [];
  const askedProducts = has(text, "san pham", "mon", "do") || (ctx.products && findByName(text, ctx.products).length > 0);

  const priced = ctx.services.filter((s) => s.price > 0 && (budget === null || s.price <= budget));
  priced.sort((a, b) => a.price - b.price);
  if (!askedProducts) {
    if (priced.length) {
      lines.push(`💸 Dịch vụ rẻ nhất: ${priced[0].name} — ${money(priced[0].price)}.`);
    } else if (ctx.services.every((s) => s.price <= 0)) {
      lines.push("Tiệm chưa niêm yết giá combo dịch vụ trên web, bạn nhắn Zalo để được báo giá nhé.");
    } else {
      lines.push(`Chưa có dịch vụ nào trong tầm ${money(budget!)}.`);
    }
    const bundle = priced.find((s) => s.originalPrice);
    if (bundle) {
      lines.push(`🎁 Combo tiết kiệm rẻ nhất: ${bundle.name} — ${money(bundle.price)} (bớt ${money(bundle.originalPrice! - bundle.price)}).`);
    }
  }

  if (!ctx.products) {
    lines.push("Mình chưa tải được danh sách sản phẩm, bạn xem ở trang Shopping nhé.");
    return { text: lines.join("\n"), links: [SHOP_LINK, ZALO_LINK] };
  }
  const named = findByName(text, ctx.products);
  const pool = (named.length ? named : byTopic(text, ctx.products))
    .filter((p) => p.stock > 0 && (budget === null || p.price <= budget))
    .sort((a, b) => a.price - b.price)
    .slice(0, 3);
  if (pool.length) {
    lines.push(
      budget === null
        ? `🛍️ Rẻ nhất là ${pool[0].name} — ${money(pool[0].price)}:`
        : `🛍️ Sản phẩm trong tầm ${money(budget)}:`
    );
  } else {
    lines.push(
      budget === null ? "Hiện chưa có sản phẩm phù hợp còn hàng." : `Chưa có sản phẩm còn hàng trong tầm ${money(budget)}.`
    );
  }
  return { text: lines.join("\n"), products: pool, links: [priced.length ? BOOK_LINK : ZALO_LINK, SHOP_LINK] };
}

function topRated(text: string, ctx: BotContext): BotReply {
  if (!ctx.products) return { text: "Mình chưa tải được danh sách sản phẩm.", links: [SHOP_LINK] };
  const rated = byTopic(text, ctx.products)
    .filter((p) => p.stock > 0 && p.review_count)
    .sort((a, b) => (b.avg_stars ?? 0) - (a.avg_stars ?? 0) || (b.review_count ?? 0) - (a.review_count ?? 0))
    .slice(0, 3);
  if (!rated.length) {
    return {
      text: "Chưa có đánh giá sản phẩm nào để xếp hạng. Bạn xem thử sản phẩm, hoặc nhắn Zalo để tiệm tư vấn nhé.",
      links: [SHOP_LINK, ZALO_LINK],
    };
  }
  return { text: "⭐ Được khách chấm cao nhất:", products: rated, links: [SHOP_LINK] };
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
      text: "• Đơn hàng: vào Hồ sơ, bấm hủy ở đơn chưa hoàn tất.\n• Lịch hẹn: nhắn Zalo cho tiệm kèm mã lịch để hủy hoặc đổi.",
      links: [{ label: "👤 Hồ sơ", href: "/ho-so" }, ZALO_LINK],
    };
  }

  if (has(t, "sau khi", "sau noi", "sau uon", "sau lam", "kieng", "giu mi", "cham soc mi", "cach cham soc")) {
    return {
      text: "🌿 Tiệm có trang hướng dẫn chăm sóc sau khi nối mi, uốn mi.",
      links: [{ label: "🌿 Xem cách chăm sóc", href: "/cham-soc" }, ZALO_LINK],
    };
  }
  if (has(t, "giam gia", "ma giam", "khuyen mai", "uu dai", "tich diem", "voucher")) {
    return {
      text: [
        ...Object.entries(COUPONS).map(([code, c]) => `• Mã ${code}: ${c.label}, giảm ${c.percent}%`),
        `• Tích điểm: đủ ${LOYALTY.every} lần làm xong, lần kế tiếp giảm ${LOYALTY.percent}% (tự trừ khi đặt lịch)`,
        "Mỗi lần chỉ áp dụng một ưu đãi cao nhất.",
      ].join("\n"),
      links: [BOOK_LINK, SHOP_LINK],
    };
  }

  const budget = parseBudget(t);
  if (budget !== null || has(t, "re", "re nhat", "gia re", "tiet kiem", "it tien", "gia thap", "hat de")) {
    return cheapest(t, ctx, budget);
  }
  if (has(t, "ngon", "tot nhat", "ban chay", "danh gia", "nhieu sao", "duoc khen", "hot")) return topRated(t, ctx);

  if (has(t, "gio mo cua", "mo cua", "may gio", "gio lam", "dong cua", "gio nao")) {
    return {
      text: `🕒 Tiệm nhận lịch:\n${ctx.sessions.map((s) => `• ${s.label}: ${s.range}`).join("\n")}`,
      links: [BOOK_LINK],
    };
  }
  if (has(t, "o dau", "dia chi", "ban do", "cho nao", "toi tiem", "den tiem")) {
    return {
      text: `📍 Tiệm ở ${ctx.shop.address}.\nBạn đặt hàng trên trang Shopping, rồi nhận hàng và trả tiền tại tiệm.`,
      links: [{ label: "🗺️ Google Maps", href: ctx.shop.googleMapsUrl }, SHOP_LINK],
    };
  }
  if (has(t, "so dien thoai", "sdt", "zalo", "lien he", "hotline", "goi tiem")) {
    return { text: `📞 Số điện thoại và Zalo của tiệm: ${ctx.shop.phone}`, links: [ZALO_LINK] };
  }
  if (has(t, "dang ky", "dang nhap", "tai khoan", "mat khau")) {
    return {
      text: "Bạn cần tài khoản để đặt mua sản phẩm. Đăng ký bằng số điện thoại và email. Quên mật khẩu thì nhắn Zalo cho tiệm.",
      links: [
        { label: "Đăng ký", href: "/dang-ky" },
        { label: "Đăng nhập", href: "/dang-nhap" },
        ZALO_LINK,
      ],
    };
  }
  if (has(t, "dat lich", "dat hen", "hen lich", "lich hen", "book")) {
    return {
      text: "📅 Cách đặt lịch:\n1. Chọn combo dịch vụ\n2. Chọn ngày\n3. Chọn giờ còn trống\n4. Nhập thông tin rồi bấm Xác nhận đặt lịch",
      links: [BOOK_LINK],
    };
  }
  if (has(t, "mua", "dat hang", "thanh toan", "gio hang", "chuyen khoan", "ship", "giao hang")) {
    return {
      text: "🛒 Cách mua hàng:\n1. Vào Shopping, thêm món vào giỏ\n2. Đăng nhập (hoặc đăng ký)\n3. Mở Giỏ hàng, bấm Đặt hàng\n4. Nhận hàng và trả tiền tại tiệm (chưa thanh toán online, chưa giao hàng)",
      links: [SHOP_LINK, { label: "🛒 Giỏ hàng", href: "/gio-hang" }],
    };
  }
  if (has(t, "huong dan", "cach dung", "su dung", "dung web", "trang web")) {
    return {
      text: "Trang web có 2 việc chính:\n• Đặt lịch làm mi, chăm sóc da\n• Shopping: mua sản phẩm, nhận tại tiệm\nBạn muốn xem cách nào?",
      links: [BOOK_LINK, SHOP_LINK],
    };
  }

  const named = ctx.products ? findByName(t, ctx.products) : [];
  if (named.length) return { text: "Mình tìm được:", products: named.slice(0, 3), links: [SHOP_LINK] };

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
  if (has(t, "san pham", "shopping", "ban gi", "co gi")) {
    return { text: "Mời bạn xem sản phẩm của tiệm. Hỏi “món nào rẻ” để mình gợi ý nhé.", links: [SHOP_LINK] };
  }
  if (has(t, "chao", "hello", "hi", "alo", "shop oi")) {
    return { text: "Chào bạn 👋 Mình giúp chọn combo, sản phẩm, hướng dẫn đặt lịch và mua hàng." };
  }
  return {
    text: "Mình chưa hiểu ý bạn. Bạn thử hỏi “combo nào rẻ”, “cách đặt lịch”, “địa chỉ”… hoặc nhắn Zalo cho tiệm.",
    links: [ZALO_LINK],
  };
}
