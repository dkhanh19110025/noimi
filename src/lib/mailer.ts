import "server-only";
import nodemailer from "nodemailer";
import { shop } from "@/data/shop";

export type MailOrder = {
  code: string;
  customer_name: string;
  customer_email: string;
  total: number;
  note?: string | null;
  items: { name: string; qty: number; price: number }[];
};

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";
const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;
function getTransport(user: string, pass: string) {
  // Dùng lại một kết nối cho các lần gửi sau (không bắt tay SMTP lại mỗi đơn).
  transport ??= nodemailer.createTransport({ service: "gmail", pool: true, maxConnections: 2, auth: { user, pass } });
  return transport;
}

export function mailConfigured(): boolean {
  return !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD;
}

/** Gửi mail qua Gmail SMTP. Thiếu cấu hình thì bỏ qua (đơn vẫn được tạo). */
export async function sendOrderMail(order: MailOrder, kind: "placed" | "cancelled"): Promise<boolean> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.warn("[mail] Chưa cấu hình GMAIL_USER / GMAIL_APP_PASSWORD, bỏ qua gửi mail.");
    return false;
  }
  const rows = order.items
    .map((i) => `<tr><td>${esc(i.name)} × ${i.qty}</td><td style="text-align:right">${vnd(i.price * i.qty)}</td></tr>`)
    .join("");
  const title = kind === "placed" ? "Đặt hàng thành công" : "Đơn hàng đã được hủy";
  const intro =
    kind === "placed"
      ? "Cảm ơn bạn đã đặt hàng. Tiệm sẽ liên hệ để bạn nhận hàng và thanh toán tại tiệm."
      : "Đơn hàng dưới đây đã được hủy.";
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px">
<h2>${title} · ${esc(order.code)}</h2>
<p>Chào ${esc(order.customer_name)},</p><p>${intro}</p>
<table style="width:100%;border-collapse:collapse">${rows}
<tr><td><b>Tổng</b></td><td style="text-align:right"><b>${vnd(order.total)}</b></td></tr></table>
${order.note ? `<p>Ghi chú: ${esc(order.note)}</p>` : ""}
<p style="color:#666">${esc(shop.name)} · ${esc(shop.address)}</p></div>`;

  try {
    await getTransport(user, pass).sendMail({
      from: `"${shop.name}" <${user}>`,
      to: order.customer_email,
      subject: `${title} ${order.code} · ${shop.name}`,
      html,
    });
    return true;
  } catch (err) {
    console.error("[mail]", (err as Error).message);
    return false;
  }
}
