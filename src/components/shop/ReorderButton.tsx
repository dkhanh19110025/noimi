"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useShop, type Product } from "./ShopProvider";

/** "Mua lại": bỏ các món của đơn cũ vào giỏ (theo giá và tồn kho hiện tại). */
export default function ReorderButton({ items }: { items: { product_id: string | null; qty: number }[] }) {
  const { addToCart } = useShop();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function reorder() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/shop/products");
      if (!res.ok) throw new Error();
      const products = (await res.json()).products as Product[];
      let added = 0;
      for (const i of items) {
        const p = products.find((x) => x.id === i.product_id);
        if (!p || p.stock <= 0) continue;
        addToCart(p.id, p.stock, i.qty);
        added++;
      }
      if (added) return router.push("/gio-hang");
      setError("Các món trong đơn này hiện đã hết hoặc ngừng bán.");
    } catch {
      setError("Chưa tải được sản phẩm. Vui lòng thử lại.");
    }
    setBusy(false);
  }

  return (
    <>
      <button type="button" className="btn btn--blue interactive" onClick={reorder} disabled={busy}>
        🔁 Mua lại
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </>
  );
}
