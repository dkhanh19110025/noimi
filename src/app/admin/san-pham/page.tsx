import Link from "next/link";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { formatPrice } from "@/data/combos";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase-server";
import { adjustStock, deleteProduct, toggleHidden } from "../shop-actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string; name: string; description: string; price: number; icon: string;
  color: string; image_url: string | null; stock: number; hidden: boolean;
};

const MESSAGES: Record<string, { text: string; error?: boolean }> = {
  saved: { text: "✅ Đã lưu sản phẩm." },
  added: { text: "✅ Đã thêm sản phẩm." },
  hidden: { text: "🙈 Đã ẩn sản phẩm khỏi trang bán." },
  shown: { text: "👀 Sản phẩm đã hiện lại." },
  deleted: { text: "🗑️ Đã xóa sản phẩm." },
  error: { text: "⚠️ Có lỗi, vui lòng thử lại.", error: true },
};

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireAdmin();
  const { msg } = await searchParams;
  const flash = msg ? MESSAGES[msg] : undefined;

  const db = getSupabase();
  let rows: Row[] = [];
  let loadError = !db;
  if (db) {
    const { data, error } = await db
      .from("products")
      .select("id, name, description, price, icon, color, image_url, stock, hidden")
      .order("sort_order")
      .order("created_at");
    if (error) loadError = true;
    rows = (data ?? []) as Row[];
  }

  return (
    <main className="container section admin-main">
      <h1 className="admin-title">Sản phẩm ({rows.length})</h1>
      <div className="admin-tabs">
        <Link href="/admin/san-pham/moi" className="pill pill--green interactive">➕ Thêm sản phẩm</Link>
        <Link href="/admin/don-hang" className="pill pill--white interactive">📦 Xem đơn hàng</Link>
      </div>

      {flash && (
        <div className={`callout${flash.error ? " callout--error" : ""}`} style={{ marginTop: 16 }} role={flash.error ? "alert" : "status"}>
          {flash.text}
        </div>
      )}
      {loadError && <div className="callout callout--error" style={{ marginTop: 16 }}>⚠️ Không tải được dữ liệu.</div>}

      <ul className="admin-list">
        {rows.map((p) => (
          <li key={p.id} className={`card admin-prod${p.hidden ? " admin-prod--hidden" : ""}`}>
            <div className="admin-prod__icon" style={{ background: `var(--${p.color})` }}>
              {p.image_url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.image_url} alt="" /> : <span aria-hidden="true">{p.icon}</span>}
            </div>
            <div className="admin-prod__body">
              <h3>{p.name} {p.hidden && <span className="pill pill--purple">Đang ẩn</span>}</h3>
              <p className="muted">{formatPrice(p.price)}</p>
              <div className="stock-row" style={{ marginTop: 8 }}>
                <span>Còn lại:</span>
                <form action={adjustStock}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="delta" value="-1" />
                  <button type="submit" className="qty__btn" aria-label={`Giảm 1 ${p.name}`} disabled={p.stock <= 0}>−</button>
                </form>
                <strong className="qty__num" aria-live="polite">{p.stock}</strong>
                <form action={adjustStock}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="delta" value="1" />
                  <button type="submit" className="qty__btn" aria-label={`Tăng 1 ${p.name}`}>+</button>
                </form>
                {p.stock === 0 && <span className="pill pill--pink">Hết hàng</span>}
              </div>
            </div>
            <div className="admin-hist__actions">
              <Link href={`/admin/san-pham/${p.id}`} className="btn btn--blue interactive">✏️ Sửa</Link>
              <form action={toggleHidden}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="hidden" value={String(!p.hidden)} />
                <button type="submit" className="btn btn--white interactive">{p.hidden ? "👀 Hiện" : "🙈 Ẩn"}</button>
              </form>
              <form action={deleteProduct}>
                <input type="hidden" name="id" value={p.id} />
                <ConfirmButton
                  className="btn btn--pink interactive"
                  title={`⚠️ Xóa ${p.name}?`}
                  message="Sản phẩm bị xóa hẳn, không khôi phục được. Đơn cũ vẫn giữ tên và giá. Nếu chỉ muốn tạm giấu thì bấm Ẩn."
                >
                  🗑️ Xóa
                </ConfirmButton>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
