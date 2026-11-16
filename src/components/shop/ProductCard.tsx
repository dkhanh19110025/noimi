"use client";

import { memo, useEffect, useRef, useState } from "react";
import { formatPrice } from "@/data/combos";
import { useShop, type Product } from "./ShopProvider";
import ProductReviews from "./ProductReviews";

export function ProductTile({ p }: { p: Product }) {
  return (
    <div className="combo-card__img product-tile" style={{ background: `var(--${p.color})` }}>
      {p.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.image_url} alt={p.name} loading="lazy" className="product-tile__img" />
      ) : (
        <span aria-hidden="true">{p.icon}</span>
      )}
    </div>
  );
}

function ProductCardImpl({ p }: { p: Product }) {
  const { cart, favs, addToCart, toggleFav } = useShop();
  const [flash, setFlash] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const inCart = cart[p.id] ?? 0;
  const soldOut = p.stock <= 0;
  const maxed = inCart >= p.stock;
  const fav = favs.includes(p.id);

  return (
    <li className="card combo-card product-card">
      <button
        type="button"
        className={`fav-btn${fav ? " is-on" : ""}`}
        aria-pressed={fav}
        aria-label={fav ? `Bỏ yêu thích ${p.name}` : `Yêu thích ${p.name}`}
        onClick={() => toggleFav(p.id)}
      >
        {fav ? "❤️" : "🤍"}
      </button>
      <ProductTile p={p} />
      <div className="combo-card__body">
        <h2 className="combo-card__name">{p.name}</h2>
        <p className="combo-card__desc">{p.description}</p>
        <ProductReviews productId={p.id} avg={p.avg_stars ?? null} count={p.review_count ?? 0} />
        <div className="combo-card__meta">
          <span className="pill pill--yellow">💰 {formatPrice(p.price)}</span>
          {soldOut ? (
            <span className="pill pill--pink">Hết hàng</span>
          ) : p.stock <= 2 ? (
            <span className="pill pill--orange">Còn {p.stock}</span>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn--blue interactive"
          disabled={soldOut || maxed}
          onClick={() => {
            addToCart(p.id, p.stock);
            setFlash(true);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => setFlash(false), 1200);
          }}
        >
          {soldOut ? "Hết hàng" : maxed ? "Đã đủ trong giỏ" : flash ? "✓ Đã thêm" : "🛒 Thêm vào giỏ"}
        </button>
      </div>
    </li>
  );
}

export default memo(ProductCardImpl);
