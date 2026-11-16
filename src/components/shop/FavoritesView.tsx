"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { useShop, type Product } from "./ShopProvider";

export default function FavoritesView() {
  const { ready, favs } = useShop();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    fetch("/api/shop/products")
      .then((r) => r.json())
      .then((j) => setProducts(j.products ?? []))
      .catch(() => setProducts([]));
  }, []);

  if (!ready || products === null) return <p className="muted" style={{ marginTop: 24 }}>Đang tải…</p>;
  const list = products.filter((p) => favs.includes(p.id));
  if (list.length === 0) {
    return (
      <div className="callout" style={{ marginTop: 24 }}>
        🤍 Bạn chưa yêu thích món nào. <Link href="/shopping" className="hl">Đi xem sản phẩm</Link>
      </div>
    );
  }
  return (
    <ul className="combo-grid" style={{ listStyle: "none", padding: 0 }}>
      {list.map((p) => <ProductCard key={p.id} p={p} />)}
    </ul>
  );
}
