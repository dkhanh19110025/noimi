// Tự kiểm tra chatbot từ khóa: npm run test:bot
import assert from "node:assert/strict";
import { parseBudget, normalize, reply } from "../src/lib/chat-bot.ts";
import { applyPercent, pickDiscount } from "../src/lib/discount.ts";
import { categoryOf } from "../src/lib/product-filter.ts";
import { topSales } from "../src/lib/stats.ts";

const p = (name, price, extra = {}) => ({ id: name, name, price, description: "", icon: "🎁", stock: 5, ...extra });
const ctx = {
  products: [
    p("Keo nối mi", 90000, { description: "Giữ mi lâu." }),
    p("Serum dưỡng mi", 120000, { avg_stars: 5, review_count: 2 }),
    p("Chổi chải mi", 30000),
    p("Kem dưỡng ẩm", 180000, { description: "Cấp ẩm mềm da." }),
    p("Gương trang điểm mini", 10000, { stock: 0 }),
  ],
  services: [
    { name: "Uốn mi", price: 0 },
    { name: "Nối mi", price: 0 },
    { name: "Chăm sóc da", price: 0 },
  ],
  shop: { address: "Gò Vấp", phone: "090", googleMapsUrl: "https://maps.example" },
  sessions: [{ label: "Buổi sáng", range: "7:00 – 11:30" }],
};
const ask = (q, c = ctx) => reply(q, c);
const names = (r) => r.products?.map((x) => x.name);

// Rẻ nhất: bỏ món hết hàng, xếp tăng dần; chưa có giá dịch vụ thì nói rõ
const cheap = ask("Có combo nào rẻ ko?");
assert.deepEqual(names(cheap), ["Chổi chải mi", "Keo nối mi", "Serum dưỡng mi"]);
assert.match(cheap.text, /chưa niêm yết giá/);
assert.deepEqual(names(ask("co combo nao re khong")), names(cheap));

// Có giá dịch vụ thì nêu combo rẻ nhất
const priced = { ...ctx, services: [{ name: "Nối mi", price: 250000 }, { name: "Uốn mi", price: 150000 }] };
assert.match(ask("combo nào rẻ nhất", priced).text, /Uốn mi — 150\.000đ/);

assert.deepEqual(names(ask("sản phẩm cho da nào rẻ")), ["Kem dưỡng ẩm"]);
assert.deepEqual(names(ask("serum giá rẻ")), ["Serum dưỡng mi"]);
assert.deepEqual(names(ask("có gì dưới 100k")), ["Chổi chải mi", "Keo nối mi"]);
assert.equal(parseBudget(normalize("tầm 1 triệu")), 1000000);
assert.equal(parseBudget(normalize("dưới 100.000đ")), 100000);
assert.equal(parseBudget(normalize("2 người")), null);
assert.deepEqual(names(ask("combo nào ngon")), ["Serum dưỡng mi"]);

assert.match(ask("mua hàng ở đâu").text, /Gò Vấp/);
assert.match(ask("làm sao để mua").text, /Cách mua hàng/);
assert.match(ask("cách đặt lịch").text, /Cách đặt lịch/);
assert.match(ask("mình muốn hủy đơn").text, /Hồ sơ/);
assert.match(ask("nối mi giá bao nhiêu").text, /Nối mi: nhắn Zalo/);
assert.match(ask("mấy giờ mở cửa").text, /7:00/);
assert.match(ask("nối mi bị ngứa thì sao").text, /không tư vấn/);
assert.match(ask("asdfgh").text, /chưa hiểu/);
assert.match(ask("rẻ", { ...ctx, products: null }).text, /chưa tải được/);

const bundled = { ...ctx, services: [{ name: "Uốn mi", price: 150000 }, { name: "Uốn mi + Serum dưỡng mi", price: 240000, originalPrice: 270000 }] };
assert.match(ask("combo nào rẻ", bundled).text, /tiết kiệm rẻ nhất: Uốn mi \+ Serum dưỡng mi — 240\.000đ \(bớt 30\.000đ\)/);
assert.equal(ask("sau khi nối mi cần kiêng gì").links[0].href, "/cham-soc");
assert.match(ask("có mã giảm giá không").text, /CHAOBAN/);

console.log("chat-bot: OK");

// Giảm giá & tích điểm
const h = (o = {}) => ({ doneBookings: 0, pendingBookings: 0, orders: 0, doneOrders: 0, ...o });
assert.equal(pickDiscount("chaoban", h(), "booking").percent, 10);
assert.equal(pickDiscount("CHAOBAN", h({ pendingBookings: 1 }), "booking").ok, false);
assert.equal(pickDiscount("QUAYLAI", h(), "order").ok, false);
assert.equal(pickDiscount("QUAYLAI", h({ doneOrders: 1, orders: 1 }), "order").percent, 5);
assert.equal(pickDiscount("", h({ doneBookings: 5 }), "booking").percent, 20);
assert.equal(pickDiscount("QUAYLAI", h({ doneBookings: 10 }), "booking").percent, 20);
assert.equal(pickDiscount("", h({ doneBookings: 5, pendingBookings: 1 }), "booking").percent, 0);
assert.equal(pickDiscount("", h({ doneBookings: 4 }), "booking").percent, 0);
assert.equal(pickDiscount("", h({ doneBookings: 5 }), "order").percent, 0);
assert.equal(pickDiscount("SAI", h(), "booking").ok, false);
assert.equal(pickDiscount("constructor", h(), "booking").ok, false);
assert.equal(applyPercent(250000, 20), 200000);
assert.equal(applyPercent(315000, 5), 299000);

// Lọc loại sản phẩm và xếp hạng bán chạy
assert.equal(categoryOf({ name: "Gương trang điểm mini", description: "soi mi mọi lúc" }), "Phụ kiện");
assert.equal(categoryOf({ name: "Nước tẩy trang mắt", description: "an toàn cho mi nối." }), "Cho mi");
assert.equal(categoryOf({ name: "Kem dưỡng ẩm", description: "Cấp ẩm mềm da." }), "Cho da");
assert.deepEqual(
  topSales([{ name: "a", qty: 1, revenue: 10 }, { name: "b", qty: 2, revenue: 5 }, { name: "a", qty: 2, revenue: 20 }]),
  [{ name: "a", qty: 3, revenue: 30 }, { name: "b", qty: 2, revenue: 5 }]
);
console.log("discount, filter, stats: OK");
