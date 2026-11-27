import Link from "next/link";
import { notFound } from "next/navigation";
import ImageFileInput from "@/components/admin/ImageFileInput";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase-server";
import { saveProduct } from "../../shop-actions";

export const dynamic = "force-dynamic";

const COLORS = [
  ["blue", "Xanh"], ["yellow", "Vàng"], ["pink", "Hồng"],
  ["green", "Lá"], ["purple", "Tím"], ["orange", "Cam"],
] as const;

const MESSAGES: Record<string, string> = {
  invalid: "⚠️ Vui lòng nhập tên, giá và số lượng hợp lệ (không âm).",
  badimg: "⚠️ Link ảnh phải bắt đầu bằng http:// hoặc https://.",
  badfile: "⚠️ Ảnh phải là file JPG, PNG hoặc WEBP, tối đa 4 MB.",
  upload: "⚠️ Không tải được ảnh lên, vui lòng thử lại.",
  error: "⚠️ Có lỗi, vui lòng thử lại.",
};

export default async function AdminProductEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { msg } = await searchParams;
  const isNew = id === "moi";

  let p = { name: "", description: "", price: 0, stock: 5, icon: "🎁", color: "blue", image_url: "" as string | null };
  if (!isNew) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
    const db = getSupabase();
    const { data } = db
      ? await db.from("products").select("name, description, price, stock, icon, color, image_url").eq("id", id).maybeSingle()
      : { data: null };
    if (!data) notFound();
    p = data as typeof p;
  }

  return (
    <main className="container section admin-main">
      <Link href="/admin/san-pham" className="hl">← Về danh sách</Link>
      <h1 className="admin-title" style={{ marginTop: 12 }}>{isNew ? "Thêm sản phẩm" : "Sửa sản phẩm"}</h1>
      {msg && MESSAGES[msg] && <div className="callout callout--error" role="alert" style={{ marginTop: 16 }}>{MESSAGES[msg]}</div>}

      <form action={saveProduct} className="card booking-form" style={{ marginTop: 20 }}>
        {!isNew && <input type="hidden" name="id" value={id} />}
        <label className="form-label">
          <span>Tên sản phẩm <span className="form-required">*</span></span>
          <input className="form-input" name="name" required maxLength={80} defaultValue={p.name} />
        </label>
        <label className="form-label">
          <span>Mô tả ngắn</span>
          <textarea className="form-input form-textarea" name="description" rows={2} maxLength={300} defaultValue={p.description} />
        </label>
        <div className="admin-form-grid">
          <label className="form-label">
            <span>Giá (đồng) <span className="form-required">*</span></span>
            <input className="form-input" name="price" type="number" min={0} step={1000} required inputMode="numeric" defaultValue={p.price} />
          </label>
          <label className="form-label">
            <span>Số lượng còn <span className="form-required">*</span></span>
            <input className="form-input" name="stock" type="number" min={0} step={1} required inputMode="numeric" defaultValue={p.stock} />
          </label>
          <label className="form-label">
            <span>Biểu tượng (emoji)</span>
            <input className="form-input" name="icon" maxLength={8} defaultValue={p.icon} />
          </label>
        </div>
        {p.image_url && (
          <div className="admin-prod__icon">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image_url} alt="Ảnh hiện tại của sản phẩm" />
          </div>
        )}
        <label className="form-label">
          <span>Tải ảnh từ máy (JPG, PNG, WEBP, tối đa 4 MB)</span>
          <ImageFileInput />
        </label>
        <label className="form-label">
          <span>Hoặc dán link ảnh (không bắt buộc; để trống và không chọn file thì dùng emoji)</span>
          <input className="form-input" name="image_url" type="url" maxLength={500} placeholder="https://…" defaultValue={p.image_url ?? ""} />
        </label>
        <fieldset style={{ border: 0, padding: 0 }}>
          <legend className="form-label">Màu nền</legend>
          <div className="color-pick" style={{ marginTop: 6 }}>
            {COLORS.map(([c, label]) => (
              <label key={c}>
                <input type="radio" name="color" value={c} defaultChecked={p.color === c} />
                <span style={{ background: `var(--${c})` }}>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="btn btn--blue interactive">💾 Lưu</button>
      </form>
    </main>
  );
}
