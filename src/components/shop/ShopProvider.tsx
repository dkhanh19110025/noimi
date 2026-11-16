"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type ShopUser = { id: string; name: string; phone: string; email: string } | null;
export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  color: string;
  image_url: string | null;
  stock: number;
  avg_stars?: number | null;
  review_count?: number;
};

type Cart = Record<string, number>;

type Ctx = {
  user: ShopUser;
  /** Tên hiển thị ở menu: dùng tên nhớ từ lần trước để khỏi nháy chữ "Đăng nhập" khi trang tĩnh vừa tải */
  displayName: string | null;
  ready: boolean;
  cart: Cart;
  cartCount: number;
  favs: string[];
  addToCart: (id: string, max: number, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  toggleFav: (id: string) => void;
  logout: () => Promise<void>;
};

const ShopCtx = createContext<Ctx | null>(null);
const CART_KEY = "lh_cart";
const FAV_KEY = "lh_favs";
const NAME_KEY = "lh_name";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* bỏ qua: trình duyệt chặn lưu trữ */
  }
}

/**
 * Trang khách được lưu sẵn trên CDN (không đọc cookie ở server) nên trạng thái đăng nhập
 * được hỏi sau khi trang tải xong qua /api/shop/me.
 */
export function ShopProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ShopUser>(null);
  const [authReady, setAuthReady] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [favs, setFavs] = useState<string[]>([]);
  const [favsReady, setFavsReady] = useState(false);
  const userRef = useRef(user);
  userRef.current = user;
  const favsRef = useRef<string[]>([]);
  favsRef.current = favs;
  const userId = user?.id ?? null;

  // 1) Giỏ hàng + tên nhớ sẵn (hiện ngay), rồi hỏi server ai đang đăng nhập.
  useEffect(() => {
    setCart(read<Cart>(CART_KEY, {}));
    setDisplayName(read<string | null>(NAME_KEY, null));
    let alive = true;
    fetch("/api/shop/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const u = (j.user ?? null) as ShopUser;
        setUser(u);
        setDisplayName(u ? u.name : null);
        write(NAME_KEY, u ? u.name : null);
      })
      .catch(() => {})
      .finally(() => alive && setAuthReady(true));
    return () => {
      alive = false;
    };
  }, []);

  // 2) Yêu thích: khách đã đăng nhập thì gộp yêu thích trên máy vào tài khoản.
  useEffect(() => {
    if (!authReady) return;
    const local = read<string[]>(FAV_KEY, []);
    let alive = true;
    if (!userId) {
      setFavs(local);
      setFavsReady(true);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/shop/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ add: local.filter((x) => /^[0-9a-f-]{36}$/i.test(x)) }),
        });
        const json = await res.json();
        if (!alive) return;
        if (json.ids) {
          setFavs(json.ids);
          write(FAV_KEY, []);
        }
      } catch {
        if (alive) setFavs(local);
      }
      if (alive) setFavsReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [authReady, userId]);

  const saveCart = useCallback((next: Cart) => {
    setCart(next);
    write(CART_KEY, next);
  }, []);

  const addToCart = useCallback(
    (id: string, max: number, qty = 1) => {
      const cur = read<Cart>(CART_KEY, {});
      const next = Math.min(max, 99, (cur[id] ?? 0) + qty);
      if (next < 1) return;
      saveCart({ ...cur, [id]: next });
    },
    [saveCart]
  );
  const setQty = useCallback(
    (id: string, qty: number) => {
      const cur = read<Cart>(CART_KEY, {});
      if (qty < 1) {
        const { [id]: _drop, ...rest } = cur;
        void _drop;
        saveCart(rest);
      } else saveCart({ ...cur, [id]: Math.min(99, qty) });
    },
    [saveCart]
  );
  const removeFromCart = useCallback((id: string) => setQty(id, 0), [setQty]);
  const clearCart = useCallback(() => saveCart({}), [saveCart]);

  const toggleFav = useCallback((id: string) => {
    const cur = favsRef.current;
    const on = cur.includes(id);
    const next = on ? cur.filter((x) => x !== id) : [...cur, id];
    favsRef.current = next;
    setFavs(next);
    if (userRef.current) {
      fetch("/api/shop/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(on ? { remove: [id] } : { add: [id] }),
      }).catch(() => {});
    } else write(FAV_KEY, next);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/shop/logout", { method: "POST" });
    write(NAME_KEY, null);
    window.location.href = "/shopping";
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      user,
      displayName,
      ready: authReady && favsReady,
      cart,
      cartCount: Object.values(cart).reduce((a, b) => a + b, 0),
      favs,
      addToCart,
      setQty,
      removeFromCart,
      clearCart,
      toggleFav,
      logout,
    }),
    [user, displayName, authReady, favsReady, cart, favs, addToCart, setQty, removeFromCart, clearCart, toggleFav, logout]
  );

  return <ShopCtx.Provider value={value}>{children}</ShopCtx.Provider>;
}

export function useShop(): Ctx {
  const v = useContext(ShopCtx);
  if (!v) throw new Error("useShop phải nằm trong ShopProvider");
  return v;
}
