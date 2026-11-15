"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase-server";
import { findAffected, parseBlockInput } from "@/lib/blocks";

const STATUSES = ["confirmed", "arrived", "cancelled", "no_show", "done"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readId(formData: FormData): string {
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) redirect("/admin");
  return id;
}

export async function updateStatus(formData: FormData) {
  await requireAdmin();
  const id = readId(formData);
  const status = String(formData.get("status") ?? "");
  if (!(STATUSES as readonly string[]).includes(status)) redirect(`/admin/lich/${id}`);

  const db = getSupabase();
  if (!db) redirect(`/admin/lich/${id}?msg=db`);

  const { error } = await db.from("bookings").update({ status }).eq("id", id);

  revalidatePath("/admin");
  revalidatePath(`/admin/lich/${id}`);
  if (error) {
    // 23P01: bật lại lịch nhưng giờ đó đã có lịch khác
    redirect(`/admin/lich/${id}?msg=${error.code === "23P01" ? "overlap" : "error"}`);
  }
  redirect(`/admin/lich/${id}?msg=saved`);
}

export async function updateNote(formData: FormData) {
  await requireAdmin();
  const id = readId(formData);
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);

  const db = getSupabase();
  if (!db) redirect(`/admin/lich/${id}?msg=db`);

  const { error } = await db
    .from("bookings")
    .update({ note: note || null })
    .eq("id", id);

  revalidatePath("/admin");
  revalidatePath(`/admin/lich/${id}`);
  redirect(`/admin/lich/${id}?msg=${error ? "error" : "saved"}`);
}

/** Đánh dấu đã làm xong: lịch rời danh sách chờ và sang trang Đã xong / Đã hủy. */
export async function markDone(formData: FormData) {
  await requireAdmin();
  const id = readId(formData);

  const db = getSupabase();
  if (!db) redirect(`/admin/lich/${id}?msg=db`);

  const { error } = await db.from("bookings").update({ status: "done" }).eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/admin/lich-su");
  revalidatePath(`/admin/lich/${id}`);
  if (error) redirect(`/admin/lich/${id}?msg=error`);
  redirect("/admin?msg=done");
}

/** Xóa HẲN lịch khỏi database (không khôi phục được). Dùng cho nút Hủy lịch và Xóa. */
export async function deleteBooking(formData: FormData) {
  await requireAdmin();
  const id = readId(formData);
  const back = String(formData.get("back") ?? "") === "history" ? "/admin/lich-su" : "/admin";

  const db = getSupabase();
  if (!db) redirect(`/admin/lich/${id}?msg=db`);

  const { data, error } = await db.from("bookings").delete().eq("id", id).select("id");

  revalidatePath("/admin");
  revalidatePath("/admin/lich-su");
  if (error || !data || data.length === 0) redirect(`${back}?msg=error`);
  redirect(`${back}?msg=deleted`);
}

/** Tạo lịch nghỉ. Nếu đã có khách đặt trong khung đó thì hỏi lại (force=1 mới lưu). */
export async function createBlock(formData: FormData) {
  await requireAdmin();
  const raw: Record<string, string> = {};
  for (const k of ["day", "type", "from", "to", "reason"]) raw[k] = String(formData.get(k) ?? "");
  const input = parseBlockInput(raw);
  if (!input) redirect("/admin/lich-nghi?msg=invalid");

  const db = getSupabase();
  if (!db) redirect("/admin/lich-nghi?msg=error");

  if (String(formData.get("force") ?? "") !== "1") {
    const affected = await findAffected(db, input.day, input.startMin, input.endMin);
    if (affected.length > 0) {
      const qs = new URLSearchParams({ confirm: "1", ...raw });
      redirect(`/admin/lich-nghi?${qs.toString()}`);
    }
  }

  const { error } = await db.from("blocked_slots").insert({
    day: input.day,
    start_min: input.startMin,
    end_min: input.endMin,
    reason: input.reason || null,
  });
  revalidatePath("/admin/lich-nghi");
  redirect(`/admin/lich-nghi?msg=${error ? "error" : "saved"}`);
}

/** Bỏ một lịch nghỉ (giờ đó mở lại cho khách đặt). */
export async function deleteBlock(formData: FormData) {
  await requireAdmin();
  const id = readId(formData);
  const db = getSupabase();
  if (!db) redirect("/admin/lich-nghi?msg=error");
  const { error } = await db.from("blocked_slots").delete().eq("id", id);
  revalidatePath("/admin/lich-nghi");
  redirect(`/admin/lich-nghi?msg=${error ? "error" : "removed"}`);
}

/* ── Đánh giá & góp ý của khách ── */

/** Duyệt (hiện công khai) hoặc ẩn lại một đánh giá. */
export async function setReviewStatus(formData: FormData) {
  await requireAdmin();
  const id = readId(formData);
  const status = String(formData.get("status") ?? "");
  if (status !== "approved" && status !== "pending") redirect("/admin/phan-hoi");

  const db = getSupabase();
  if (!db) redirect("/admin/phan-hoi?msg=error");
  const { error } = await db.from("reviews").update({ status }).eq("id", id);
  revalidatePath("/admin/phan-hoi");
  revalidatePath("/danh-gia");
  redirect(`/admin/phan-hoi?msg=${error ? "error" : status === "approved" ? "approved" : "hidden"}`);
}

/** Xóa hẳn một đánh giá (không khôi phục được). */
export async function deleteReview(formData: FormData) {
  await requireAdmin();
  const id = readId(formData);
  const db = getSupabase();
  if (!db) redirect("/admin/phan-hoi?msg=error");
  const { error } = await db.from("reviews").delete().eq("id", id);
  revalidatePath("/admin/phan-hoi");
  revalidatePath("/danh-gia");
  redirect(`/admin/phan-hoi?msg=${error ? "error" : "deleted"}`);
}

/** Xóa hẳn một góp ý. */
export async function deleteNote(formData: FormData) {
  await requireAdmin();
  const id = readId(formData);
  const db = getSupabase();
  if (!db) redirect("/admin/phan-hoi?tab=gop-y&msg=error");
  const { error } = await db.from("feedback_notes").delete().eq("id", id);
  revalidatePath("/admin/phan-hoi");
  redirect(`/admin/phan-hoi?tab=gop-y&msg=${error ? "error" : "deleted"}`);
}
