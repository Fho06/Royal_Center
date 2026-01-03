"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { Item } from "@/app/(shop)/types";

/* =========================
   TYPES
   ========================= */

export type CartItem = {
  item_id: string;
  name: string;
  price: number;     // snapshot
  quantity: number;  // requested qty
  stock: number;
};


type CartContextType = {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;

  cartQty: (itemId: string) => number;
  remainingStock: (item: Item) => number;

  addToCart: (item: Item) => void;

  increaseQty: (item: string) => void;
  decreaseQty: (itemId: string) => void;

  clearCart: () => void;
  cartCount: number;
};


const CartContext = createContext<CartContextType | null>(null);

/* =========================
   STORAGE KEY
   ========================= */

function getCartStorageKey(userId?: number) {
  return userId
    ? `royal_center_cart_user_${userId}`
    : "royal_center_cart_guest";
}

/* =========================
   PROVIDER
   ========================= */

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const storageKeyRef = useRef<string | null>(null);

  /* ---------- HYDRATION ---------- */

  useEffect(() => {
    storageKeyRef.current = getCartStorageKey(user?.userId);
    setHydrated(true);
  }, [user?.userId]);

  /* ---------- LOAD ---------- */

  useEffect(() => {
    if (!hydrated || !storageKeyRef.current) return;

    const stored = localStorage.getItem(storageKeyRef.current);
    if (!stored) {
      setCart([]);
      return;
    }

    try {
      setCart(JSON.parse(stored));
    } catch {
      localStorage.removeItem(storageKeyRef.current);
      setCart([]);
    }
  }, [hydrated]);

  /* ---------- PERSIST ---------- */

  useEffect(() => {
    if (!hydrated || !storageKeyRef.current) return;
    localStorage.setItem(storageKeyRef.current, JSON.stringify(cart));
  }, [cart, hydrated]);

  /* =========================
     DERIVED VALUES
     ========================= */

  const cartCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  /* =========================
     CART HELPERS
     ========================= */

  function cartQty(itemId: string) {
    return cart.find(c => c.item_id === itemId)?.quantity ?? 0;
  }

  function remainingStock(item: Item) {
    return Math.max(0, item.available_stock - cartQty(item.id));
  }

  function addToCart(item: {
    id: string;
    name: string;
    price_usd: number;
    available_stock: number;
  }) {
    setCart(prev => {
      const existing = prev.find(c => c.item_id === item.id);

      if (existing) {
        if (existing.quantity >= existing.stock) return prev;

        return prev.map(c =>
          c.item_id === item.id
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }

      return [
        ...prev,
        {
          item_id: item.id,
          name: item.name,
          price: item.price_usd,
          quantity: 1,
          stock: item.available_stock, // ✅ snapshot
        },
      ];
    });
  }

  function increaseQty(itemId: string) {
    setCart(prev =>
      prev.map(c => {
        if (c.item_id !== itemId) return c;
        if (c.quantity >= c.stock) return c;
        return { ...c, quantity: c.quantity + 1 };
      })
    );
  }




  function decreaseQty(itemId: string) {
    setCart(prev =>
      prev
        .map(c =>
          c.item_id === itemId
            ? { ...c, quantity: c.quantity - 1 }
            : c
        )
        .filter(c => c.quantity > 0)
    );
  }

  function clearCart() {
    if (!storageKeyRef.current) return;
    setCart([]);
    localStorage.removeItem(storageKeyRef.current);
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        setCart,
        cartQty,
        remainingStock,
        addToCart,
        increaseQty,
        decreaseQty,
        clearCart,
        cartCount, // ✅ EXPOSED HERE
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

/* =========================
   HOOK
   ========================= */

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
