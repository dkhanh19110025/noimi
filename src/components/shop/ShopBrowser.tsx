"use client";

import { useState } from "react";
import { normalize } from "@/lib/chat-bot";
import { categoryOf, CATEGORIES, PRICE_RANGES } from "@/lib/product-filter";
import ProductCard from "./ProductCard";
import type { Product } from "./ShopProvider";

type Option = { id: string; label: string };

function Chips({ label, items, value, onChange }: { label: string; items: Option[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="filter-row" role="group" aria-label={label}>
      {[{ id: "", label: "Tất cả" }, ...items].map((i) => (
        <button key={i.id} type="button" className="filter-chip" aria-pressed={value === i.id} onClick={() => onChange(i.id)}>
          {i.label}
        </button>
      ))}
    </div>
  );
}

/** Danh sách sản phẩm kèm tìm kiếm, lọc theo loại và giá. */
export default function ShopBrowser({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [range, setRange] = useState("");
  const [sort, setSort] = useState("");

  const q = normalize(query);
  const inRange = PRICE_RANGES.find((r) => r.id === range)?.match;
  const list = products.filter(
    (p) =>
      (!q || normalize(`${p.name} ${p.description}`).includes(q)) &&
      (!category || categoryOf(p) === category) &&
      (!inRange || inRange(p.price))
  );
  if (sort) list.sort((a, b) => (sort === "asc" ? a.price - b.price : b.price - a.price));

  return (
    <>
      <div className="filter-box">
        <input
          type="search"
          className="form-input"
          placeholder="🔍 Tìm sản phẩm…"
          aria-label="Tìm sản phẩm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Chips label="Lọc theo loại" items={CATEGORIES.map((c) => ({ id: c, label: c }))} value={category} onChange={setCategory} />
        <Chips label="Lọc theo giá" items={PRICE_RANGES} value={range} onChange={setRange} />
        <select className="form-input" aria-label="Sắp xếp" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="">Sắp xếp: mặc định</option>
          <option value="asc">Giá thấp đến cao</option>
          <option value="desc">Giá cao đến thấp</option>
        </select>
      </div>
      <p className="muted" role="status">{list.length} sản phẩm</p>
      {list.length === 0 && <div className="callout">🔍 Không có sản phẩm phù hợp. Thử bỏ bớt bộ lọc nhé.</div>}
      <ul className="combo-grid" style={{ listStyle: "none", padding: 0 }}>
        {list.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </ul>
    </>
  );
}
