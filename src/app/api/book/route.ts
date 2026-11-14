import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { combos } from "@/data/combos";
import { MAX_PENDING_PER_PHONE, vnIso } from "@/data/booking";
import { getSupabase } from "@/lib/supabase-server";
import { getFreeSlots } from "@/lib/availability-db";

export const dynamic = "force-dynamic";

/** Chuẩn hóa SĐT về dạng 0XXXXXXXXX. Trả về null nếu không hợp lệ. */
function normalizePhone(raw: string): string | null {
  let p = raw.replace(/[\s.\-()]/g, "");
  if (p.startsWith("+84")) p = "0" + p.slice(3);
  else if (p.startsWith("84") && p.length >= 11) p = "0" + p.slice(2);
  return /^0\d{9}$/.test(p) ? p : null;
}

const bodySchema = z.object({
  comboId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(20),
  email: z.string().trim().max(200).optional().default(""),
  note: z.string().trim().max(500).optional().default(""),
  turnstileToken: z.string().min(1),
});

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, code, error: message }, { status });
}

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret =
    process.env.TURNSTILE_SECRET_KEY ?? "1x0000000000000000000000000000000AA"; // khóa thử
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }),
      }
    );
    const json = await res.json();
    return json.success === true;
  } catch {
    console.warn("[Turnstile] Không gọi được Cloudflare");
    return process.env.NODE_ENV === "development";
  }
}

/** Gửi mail xác nhận (chưa tích hợp). Không ghi thông tin cá nhân vào log. */
async function sendConfirmationEmail(code: string, hasEmail: boolean) {
  if (!hasEmail) return;
  // TODO: tích hợp Resend. Lỗi gửi mail không được làm hỏng việc đặt lịch.
  console.log(`[email] cần gửi xác nhận cho lịch ${code}`);
}

/* POST /api/book */
export async function POST(req: NextRequest) {
  const db = getSupabase();
  if (!db) {
    return fail(503, "NOT_CONFIGURED", "Hệ thống chưa kết nối database.");
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail(400, "BAD_REQUEST", "Thiếu hoặc sai thông tin bắt buộc.");
    }
    body = parsed.data;
  } catch {
    return fail(400, "BAD_REQUEST", "Dữ liệu gửi lên không hợp lệ.");
  }

  const combo = combos.find((c) => c.id === body.comboId);
  if (!combo) return fail(400, "BAD_REQUEST", "Combo không tồn tại.");

  const phone = normalizePhone(body.phone);
  if (!phone) return fail(400, "BAD_PHONE", "Số điện thoại không hợp lệ.");

  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return fail(400, "BAD_EMAIL", "Email không hợp lệ.");
  }

  if (!(await verifyTurnstile(body.turnstileToken))) {
    return fail(403, "TURNSTILE", "Xác minh bảo mật thất bại. Vui lòng thử lại.");
  }

  try {
    // Tính lại giờ trống ở server, không tin giờ do trình duyệt gửi lên.
    const free = await getFreeSlots(db, body.date, combo.durationMinutes);
    if (!free.includes(body.time)) {
      return fail(
        409,
        "SLOT_TAKEN",
        "Giờ này vừa có người đặt hoặc không còn nhận lịch. Vui lòng chọn giờ khác."
      );
    }

    // Giới hạn số lịch đang chờ của một SĐT
    const { count, error: countErr } = await db
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("customer_phone", phone)
      .eq("status", "confirmed")
      .gt("starts_at", new Date().toISOString());
    if (countErr) throw countErr;
    if ((count ?? 0) >= MAX_PENDING_PER_PHONE) {
      return fail(
        429,
        "TOO_MANY",
        `Số điện thoại này đã có ${count} lịch sắp tới. Tối đa ${MAX_PENDING_PER_PHONE} lịch.`
      );
    }

    const startsAt = new Date(vnIso(body.date, body.time));
    const endsAt = new Date(startsAt.getTime() + combo.durationMinutes * 60_000);
    const code = randomBytes(4).toString("hex").toUpperCase();

    const { error } = await db.from("bookings").insert({
      code,
      combo_id: combo.id,
      combo_name: combo.name,
      price: combo.price,
      customer_name: body.name,
      customer_phone: phone,
      customer_email: body.email || null,
      note: body.note || null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      manage_token: randomBytes(24).toString("base64url"),
    });

    if (error) {
      // 23P01 = vi phạm ràng buộc chống trùng giờ (hai người bấm cùng lúc)
      if (error.code === "23P01") {
        return fail(
          409,
          "SLOT_TAKEN",
          "Giờ này vừa có người đặt. Vui lòng chọn giờ khác."
        );
      }
      throw error;
    }

    sendConfirmationEmail(code, !!body.email).catch(() => {});

    return NextResponse.json({ ok: true, bookingId: code, message: "Đặt lịch thành công!" });
  } catch (err) {
    console.error("[POST /api/book]", (err as Error).message);
    return fail(500, "SERVER_ERROR", "Lỗi hệ thống. Vui lòng thử lại.");
  }
}
