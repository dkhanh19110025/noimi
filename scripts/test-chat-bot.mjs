// Tự kiểm tra chatbot từ khóa: npm run test:bot
import assert from "node:assert/strict";
import { parseBudget, normalize, reply } from "../src/lib/chat-bot.ts";
import { applyPercent, pickDiscount } from "../src/lib/discount.ts";
import { categoryOf } from "../src/lib/product-filter.ts";
import { topSales } from "../src/lib/stats.ts";

const ctx = {
  services: [
    { name: "Uốn mi", price: 0 },
    { name: "Nối mi", price: 0 },
    { name: "Chăm sóc da", price: 0 },
  ],
  shop: { address: "Gò Vấp", phone: "090", googleMapsUrl: "https://maps.example" },
  sessions: [{ label: "Buổi sáng", range: "7:00 – 11:30" }],
};
const ask = (q, c = ctx) => reply(q, c);

// Chưa có giá dịch vụ thì nói rõ
assert.match(ask("Có combo nào rẻ ko?").text, /chưa niêm yết giá/);
assert.match(ask("co combo nao re khong").text, /chưa niêm yết giá/);

// Có giá dịch vụ thì nêu combo rẻ nhất
const priced = { ...ctx, services: [{ name: "Nối mi", price: 250000 }, { name: "Uốn mi", price: 150000 }] };
assert.match(ask("combo nào rẻ nhất", priced).text, /Uốn mi — 150\.000đ/);
assert.match(ask("có gì dưới 100k", priced).text, /Chưa có dịch vụ nào trong tầm 100\.000đ/);

assert.equal(parseBudget(normalize("tầm 1 triệu")), 1000000);
assert.equal(parseBudget(normalize("dưới 100.000đ")), 100000);
assert.equal(parseBudget(normalize("2 người")), null);

assert.match(ask("tiệm ở đâu").text, /Gò Vấp/);
assert.match(ask("cách đặt lịch").text, /Cách đặt lịch/);
assert.match(ask("mình muốn hủy lịch").text, /mã lịch/);
assert.match(ask("nối mi giá bao nhiêu").text, /Nối mi: nhắn Zalo/);
assert.match(ask("mấy giờ mở cửa").text, /7:00/);
assert.match(ask("nối mi bị ngứa thì sao").text, /không tư vấn/);
assert.match(ask("asdfgh").text, /chưa hiểu/);

// Không dẫn sang khu Shopping
for (const q of ["mua hàng ở đâu", "giỏ hàng", "đăng nhập", "hủy đơn", "sản phẩm", "combo nào ngon", "hướng dẫn dùng web", "chào"]) {
  for (const l of ask(q).links ?? []) assert.doesNotMatch(l.href, /^\/(shopping|gio-hang|ho-so|dang-)/, q);
}

const bundled = { ...ctx, services: [{ name: "Uốn mi", price: 150000 }, { name: "Uốn mi + Serum dưỡng mi", price: 240000, originalPrice: 270000 }] };
assert.match(ask("combo nào rẻ", bundled).text, /tiết kiệm rẻ nhất: Uốn mi \+ Serum dưỡng mi — 240\.000đ \(bớt 30\.000đ\)/);
assert.equal(ask("sau khi nối mi cần kiêng gì").links[0].href, "zalo");
assert.match(ask("có mã giảm giá không").text, /LINHHUE: giảm 10%/);

console.log("chat-bot: OK");

// Giảm giá & tích điểm
const h = (o = {}) => ({ doneBookings: 0, pendingBookings: 0, ...o });
assert.equal(pickDiscount(" linhhue ", h()).percent, 10);
assert.equal(pickDiscount("LINHHUE", h({ doneBookings: 3, pendingBookings: 1 })).percent, 10);
assert.equal(pickDiscount("", h({ doneBookings: 5 })).percent, 20);
assert.equal(pickDiscount("LINHHUE", h({ doneBookings: 10 })).percent, 20);
assert.equal(pickDiscount("", h({ doneBookings: 5, pendingBookings: 1 })).percent, 0);
assert.equal(pickDiscount("", h({ doneBookings: 4 })).percent, 0);
assert.equal(pickDiscount("CHAOBAN", h()).ok, false);
assert.equal(pickDiscount("QUAYLAI", h({ doneBookings: 1 })).ok, false);
assert.equal(pickDiscount("constructor", h()).ok, false);
assert.equal(applyPercent(250000, 20), 200000);
assert.equal(applyPercent(315000, 5), 299000);

// Lọc loại sản phẩm và xếp hạng bán chạy
assert.equal(categoryOf({ name: "Mạch ESP32" }), "Mạch");
assert.equal(categoryOf({ name: "Màn hình LED" }), "Mạch");
assert.equal(categoryOf({ name: "Cảm biến âm thanh" }), "Cảm biến");
assert.equal(categoryOf({ name: "Bệ đỡ ESP32" }), "Phụ kiện");
assert.deepEqual(
  topSales([{ name: "a", qty: 1, revenue: 10 }, { name: "b", qty: 2, revenue: 5 }, { name: "a", qty: 2, revenue: 20 }]),
  [{ name: "a", qty: 3, revenue: 30 }, { name: "b", qty: 2, revenue: 5 }]
);
console.log("discount, filter, stats: OK");
