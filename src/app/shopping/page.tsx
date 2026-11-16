import ProductCard from "@/components/shop/ProductCard";
import type { Product } from "@/components/shop/ShopProvider";
import { getCatalog } from "@/lib/catalog";
import { shop } from "@/data/shop";

// Lưu sẵn trên CDN, làm mới tối đa 60 giây/lần và ngay khi có đơn/hủy đơn/admin sửa (invalidateCatalog).
export const revalidate = 60;

export default async function ShoppingPage() {
  let products: Product[] = [];
  let failed = false;
  try {
    const list = await getCatalog();
    if (list === null) failed = true;
    else products = list;
  } catch {
    failed = true;
  }

  return (
    <main className="container section">
      <span className="badge-tilt">Shopping</span>
      <h1 style={{ marginTop: 24 }}>Đồ chăm mi & da</h1>
      <p className="subtitle">— giữ vẻ đẹp lâu hơn</p>
      <p className="muted" style={{ marginTop: 12 }}>
        Thêm vào giỏ, đặt hàng, nhận và thanh toán tại <span className="hl">{shop.name}</span>.
      </p>

      {failed && (
        <div className="callout callout--error" style={{ marginTop: 24 }}>
          ⚠️ Chưa tải được sản phẩm. Vui lòng thử lại sau.
        </div>
      )}
      {!failed && products.length === 0 && (
        <div className="callout" style={{ marginTop: 24 }}>🛍️ Hiện chưa có sản phẩm nào.</div>
      )}

      <ul className="combo-grid" style={{ listStyle: "none", padding: 0 }}>
        {products.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </ul>
    </main>
  );
}
