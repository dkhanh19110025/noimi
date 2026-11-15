import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/** Mỗi người (theo IP) gửi tối đa từng này lần mỗi giờ, cho mỗi loại. */
const MAX_PER_HOUR = 3;

const reviewSchema = z.object({
  type: z.literal("review"),
  name: z.string().trim().min(1).max(60),
  stars: z.coerce.number().int().min(1).max(5),
  content: z.string().trim().min(1).max(600),
  website: z.string().optional(), // ô bẫy bot: người thật không thấy nên không điền
});

const noteSchema = z.object({
  type: z.literal("feedback"),
  name: z.string().trim().max(60).optional().default(""),
  phone: z.string().trim().max(20).optional().default(""),
  content: z.string().trim().min(1).max(1000),
  website: z.string().optional(),
});

const bodySchema = z.discriminatedUnion("type", [reviewSchema, noteSchema]);

function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

/** Băm IP một chiều: chỉ để đếm số lần gửi, không lưu IP thật. */
function hashIp(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256")
    .update(ip + (process.env.ADMIN_SESSION_SECRET ?? ""))
    .digest("hex")
    .slice(0, 32);
}

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail(400, "Dữ liệu không hợp lệ.");
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return fail(400, "Vui lòng điền đủ và đúng thông tin.");
  const body = parsed.data;

  // Bot điền ô bẫy: báo thành công giả, không lưu gì.
  if (body.website) return NextResponse.json({ ok: true });

  const db = getSupabase();
  if (!db) return fail(503, "Hệ thống chưa sẵn sàng. Vui lòng thử lại sau.");

  const table = body.type === "review" ? "reviews" : "feedback_notes";
  const ipHash = hashIp(req);

  try {
    const since = new Date(Date.now() - 60 * 60_000).toISOString();
    const { count, error: countErr } = await db
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gt("created_at", since);
    if (countErr) throw countErr;
    if ((count ?? 0) >= MAX_PER_HOUR) {
      return fail(429, "Bạn đã gửi nhiều lần, vui lòng thử lại sau ít phút.");
    }

    const { error } =
      body.type === "review"
        ? await db.from("reviews").insert({
            name: body.name,
            stars: body.stars,
            content: body.content,
            ip_hash: ipHash,
          })
        : await db.from("feedback_notes").insert({
            name: body.name || null,
            phone: body.phone || null,
            content: body.content,
            ip_hash: ipHash,
          });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/phan-hoi]", (err as Error).message);
    return fail(500, "Lỗi hệ thống. Vui lòng thử lại.");
  }
}
