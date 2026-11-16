import Link from "next/link";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase-server";
import { deleteCustomer, resetCustomerPassword } from "../shop-actions";

export const dynamic = "force-dynamic";

type Row = { id: string; name: string; phone: string; email: string; created_at: string };

const MESSAGES: Record<string, { text: string; error?: boolean }> = {
  pwd: { text: "🔑 Đã đổi mật khẩu. Khách bị đăng xuất khỏi các máy cũ và cần đăng nhập lại." },
  deleted: { text: "🗑️ Đã xóa tài khoản. Đơn hàng cũ vẫn được giữ lại." },
  weak: { text: "⚠️ Mật khẩu mới phải từ 6 ký tự.", error: true },
  error: { text: "⚠️ Có lỗi, vui lòng thử lại.", error: true },
};

export default async function AdminAccountsPage({ searchParams }: { searchParams: Promise<{ q?: string; msg?: string }> }) {
  await requireAdmin();
  const { q = "", msg } = await searchParams;
  const flash = msg ? MESSAGES[msg] : undefined;
  // Bỏ ký tự đặc biệt của bộ lọc PostgREST trước khi ghép vào điều kiện tìm kiếm
  const term = q.trim().slice(0, 40).replace(/[^\p{L}\p{N} ]/gu, "");

  const db = getSupabase();
  let rows: Row[] = [];
  const orderCount: Record<string, number> = {};
  let loadError = !db;
  if (db) {
    let query = db
      .from("customers")
      .select("id, name, phone, email, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (term) query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);
    const { data, error } = await query;
    if (error) loadError = true;
    rows = (data ?? []) as Row[];

    if (rows.length) {
      const { data: os } = await db.from("shop_orders").select("customer_id").in("customer_id", rows.map((r) => r.id));
      for (const o of os ?? []) orderCount[o.customer_id as string] = (orderCount[o.customer_id as string] ?? 0) + 1;
    }
  }

  return (
    <main className="container section admin-main">
      <h1 className="admin-title">Tài khoản khách ({rows.length})</h1>

      <form method="get" className="admin-tabs" role="search">
        <input
          className="form-input"
          type="search"
          name="q"
          defaultValue={term}
          placeholder="Tìm theo tên, SĐT hoặc email"
          aria-label="Tìm tài khoản"
          maxLength={40}
        />
        <button type="submit" className="btn btn--blue interactive">🔍 Tìm</button>
        {term && <Link href="/admin/tai-khoan" className="btn btn--white interactive">Xóa lọc</Link>}
      </form>

      {flash && (
        <div className={`callout${flash.error ? " callout--error" : ""}`} style={{ marginTop: 16 }} role={flash.error ? "alert" : "status"}>
          {flash.text}
        </div>
      )}
      {loadError && <div className="callout callout--error" style={{ marginTop: 16 }}>⚠️ Không tải được dữ liệu.</div>}
      {!loadError && rows.length === 0 && <div className="callout" style={{ marginTop: 24 }}>😌 Không có tài khoản nào.</div>}

      <ul className="admin-list">
        {rows.map((c) => (
          <li key={c.id} className="card">
            <h3>{c.name}</h3>
            <p className="muted">
              📞 {c.phone} · ✉️ {c.email}
            </p>
            <p className="muted">
              Tạo ngày {new Date(c.created_at).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} ·{" "}
              {orderCount[c.id] ?? 0} đơn hàng
            </p>

            <form action={resetCustomerPassword} className="stock-row" style={{ marginTop: 12 }}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="q" value={term} />
              <input
                className="form-input"
                type="text"
                name="password"
                required
                minLength={6}
                maxLength={128}
                autoComplete="off"
                placeholder="Mật khẩu mới (từ 6 ký tự)"
                aria-label={`Mật khẩu mới cho ${c.name}`}
              />
              <button type="submit" className="btn btn--blue interactive">🔑 Đổi mật khẩu</button>
            </form>

            <div className="admin-hist__actions" style={{ marginTop: 12 }}>
              <form action={deleteCustomer}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="q" value={term} />
                <ConfirmButton
                  className="btn btn--pink interactive"
                  title={`⚠️ Xóa tài khoản ${c.name}?`}
                  message="Khách không đăng nhập được nữa và danh sách yêu thích bị xóa. Đơn hàng và đánh giá cũ vẫn được giữ. Không khôi phục được."
                >
                  🗑️ Xóa tài khoản
                </ConfirmButton>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
