"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase-server";
import { sendOrderMail } from "@/lib/mailer";
import { hashPassword } from "@/lib/admin-password";
import { invalidateCatalog } from "@/lib/catalog";
import { MAX_IMAGE_BYTES, sniffImage, uploadedImageName } from "@/lib/image-file";
import type { SupabaseClient } from "@supabase/supabase-js";

const IMAGE_BUCKET = "product-images"; // supabase/migrations/011_product_images.sql
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLORS = ["blue", "yellow", "pink", "green", "purple", "orange"];

function refresh() {
  invalidateCatalog();
  revalidatePath("/admin/san-pham");
  revalidatePath("/admin/don-hang");
  revalidatePath("/shopping");
}

/** Xóa khỏi Storage những ảnh đã tải lên mà không còn sản phẩm nào dùng. Link ngoài được bỏ qua. */
async function removeUnusedImages(db: SupabaseClient, urls: (string | null)[]) {
  const bucket = db.storage.from(IMAGE_BUCKET);
  const prefix = bucket.getPublicUrl("").data.publicUrl;
  for (const name of new Set(urls.map((u) => uploadedImageName(u, prefix)))) {
    if (!name) continue;
    const { count, error } = await db
      .from("products")
      .select("id", { count: "exact", head: true })
      .like("image_url", `%${name}%`);
    // Không chắc chắn thì giữ lại ảnh
    if (error || count !== 0) continue;
    const removed = await bucket.remove([name]);
    if (removed.error) console.error("Xóa ảnh sản phẩm thất bại:", name, removed.error.message);
  }
}

/** Tăng / giảm tồn kho trực tiếp (không âm). */
export async function adjustStock(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const delta = Number(formData.get("delta"));
  if (!UUID.test(id) || ![-1, 1].includes(delta)) redirect("/admin/san-pham");
  const db = getSupabase();
  if (!db) redirect("/admin/san-pham?msg=error");
  const { error } = await db.rpc("adjust_stock", { p_product: id, p_delta: delta });
  refresh();
  redirect(`/admin/san-pham${error ? "?msg=error" : ""}`);
}

export async function toggleHidden(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const hidden = String(formData.get("hidden")) === "true";
  if (!UUID.test(id)) redirect("/admin/san-pham");
  const db = getSupabase();
  if (!db) redirect("/admin/san-pham?msg=error");
  const { error } = await db.from("products").update({ hidden }).eq("id", id);
  refresh();
  redirect(`/admin/san-pham?msg=${error ? "error" : hidden ? "hidden" : "shown"}`);
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) redirect("/admin/san-pham");
  const db = getSupabase();
  if (!db) redirect("/admin/san-pham?msg=error");
  const { data: gone, error } = await db.from("products").delete().eq("id", id).select("image_url");
  await removeUnusedImages(db, (gone ?? []).map((p) => p.image_url as string | null));
  refresh();
  redirect(`/admin/san-pham?msg=${error ? "error" : "deleted"}`);
}

/** Thêm mới (không có id) hoặc sửa sản phẩm. */
export async function saveProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const back = id ? `/admin/san-pham/${id}` : "/admin/san-pham/moi";
  if (id && !UUID.test(id)) redirect("/admin/san-pham");

  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const description = String(formData.get("description") ?? "").trim().slice(0, 300);
  const price = Math.floor(Number(formData.get("price")));
  const stock = Math.floor(Number(formData.get("stock")));
  const icon = String(formData.get("icon") ?? "").trim().slice(0, 8) || "🎁";
  const color = String(formData.get("color") ?? "");
  const imageRaw = String(formData.get("image_url") ?? "").trim();
  let image_url = imageRaw && /^https?:\/\//i.test(imageRaw) ? imageRaw.slice(0, 500) : null;
  const file = formData.get("image_file");
  const upload = file instanceof File && file.size > 0 ? file : null;

  if (!name || !Number.isFinite(price) || price < 0 || !Number.isFinite(stock) || stock < 0 || !COLORS.includes(color)) {
    redirect(`${back}?msg=invalid`);
  }
  // Có chọn file thì file thay cho link ảnh
  if (!upload && imageRaw && !image_url) redirect(`${back}?msg=badimg`);
  if (upload && upload.size > MAX_IMAGE_BYTES) redirect(`${back}?msg=badfile`);
  const bytes = upload ? new Uint8Array(await upload.arrayBuffer()) : null;
  const type = bytes ? sniffImage(bytes) : null;
  if (bytes && !type) redirect(`${back}?msg=badfile`);

  const db = getSupabase();
  if (!db) redirect(`${back}?msg=error`);

  if (bytes && type) {
    const bucket = db.storage.from(IMAGE_BUCKET);
    const path = `${randomUUID()}.${type.ext}`;
    const { error } = await bucket.upload(path, bytes, { contentType: type.mime, cacheControl: "31536000" });
    if (error) {
      console.error("Tải ảnh sản phẩm thất bại:", error.message);
      redirect(`${back}?msg=upload`);
    }
    image_url = bucket.getPublicUrl(path).data.publicUrl;
  }

  if (id) {
    const { data: old } = await db.from("products").select("image_url").eq("id", id).maybeSingle();
    const { error } = await db.from("products").update({ name, description, price, stock, icon, color, image_url }).eq("id", id);
    // Lưu được thì dọn ảnh cũ, lưu lỗi thì dọn ảnh vừa tải lên
    await removeUnusedImages(db, [(old?.image_url as string | null) ?? null, image_url]);
    refresh();
    redirect(error ? `${back}?msg=error` : "/admin/san-pham?msg=saved");
  }
  const { data: last } = await db.from("products").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const sort_order = ((last?.[0]?.sort_order as number | undefined) ?? 0) + 1;
  const { error } = await db.from("products").insert({ name, description, price, stock, icon, color, image_url, sort_order });
  if (error) await removeUnusedImages(db, [image_url]);
  refresh();
  redirect(error ? `${back}?msg=error` : "/admin/san-pham?msg=added");
}

/** Admin: xác nhận khách đã nhận hàng, hoặc hủy đơn (hoàn kho). */
export async function adminOrderAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  const tab = String(formData.get("tab") ?? "");
  const back = `/admin/don-hang${tab ? `?tab=${encodeURIComponent(tab)}` : ""}`;
  const sep = back.includes("?") ? "&" : "?";
  if (!UUID.test(id) || !["done", "cancel"].includes(action)) redirect("/admin/don-hang");
  const db = getSupabase();
  if (!db) redirect(`${back}${sep}msg=error`);

  if (action === "done") {
    const { error } = await db
      .from("shop_orders")
      .update({ status: "done", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "placed");
    refresh();
    redirect(`${back}${sep}msg=${error ? "error" : "done"}`);
  }

  const { data, error } = await db.rpc("cancel_order", { p_order: id, p_customer: null, p_by: "admin" });
  refresh();
  if (error || data !== "OK") redirect(`${back}${sep}msg=error`);

  after(async () => {
    const { data: o } = await db
      .from("shop_orders")
      .select("code, total, note, customer_name, customer_email, shop_order_items(name, qty, price)")
      .eq("id", id)
      .single();
    if (o) {
      await sendOrderMail(
        {
          code: o.code,
          customer_name: o.customer_name,
          customer_email: o.customer_email,
          total: o.total,
          note: o.note,
          items: (o.shop_order_items ?? []) as { name: string; qty: number; price: number }[],
        },
        "cancelled"
      );
    }
  });
  redirect(`${back}${sep}msg=cancelled`);
}

/* ── Tài khoản khách ── */

/** Đặt mật khẩu mới cho khách và đăng xuất các máy đang đăng nhập. */
export async function resetCustomerPassword(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const q = String(formData.get("q") ?? "");
  const password = String(formData.get("password") ?? "");
  const base = `/admin/tai-khoan${q ? `?q=${encodeURIComponent(q)}&` : "?"}`;
  if (!UUID.test(id)) redirect("/admin/tai-khoan");
  if (password.length < 6 || password.length > 128) redirect(`${base}msg=weak`);

  const db = getSupabase();
  if (!db) redirect(`${base}msg=error`);
  const { data: cur } = await db.from("customers").select("session_version").eq("id", id).maybeSingle();
  if (!cur) redirect(`${base}msg=error`);
  const { error } = await db
    .from("customers")
    .update({ password_hash: await hashPassword(password), session_version: (cur.session_version as number) + 1 })
    .eq("id", id);
  revalidatePath("/admin/tai-khoan");
  redirect(`${base}msg=${error ? "error" : "pwd"}`);
}

/** Xóa tài khoản khách. Đơn hàng cũ và đánh giá được giữ lại (chỉ gỡ liên kết với tài khoản). */
export async function deleteCustomer(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const q = String(formData.get("q") ?? "");
  const base = `/admin/tai-khoan${q ? `?q=${encodeURIComponent(q)}&` : "?"}`;
  if (!UUID.test(id)) redirect("/admin/tai-khoan");
  const db = getSupabase();
  if (!db) redirect(`${base}msg=error`);
  const { error } = await db.from("customers").delete().eq("id", id);
  revalidatePath("/admin/tai-khoan");
  revalidatePath("/admin/don-hang");
  redirect(`${base}msg=${error ? "error" : "deleted"}`);
}
