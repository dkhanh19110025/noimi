"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase-server";

const STATUSES = ["confirmed", "arrived", "cancelled", "no_show"] as const;
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
