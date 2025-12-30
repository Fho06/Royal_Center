"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";

type CartItem = {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
};

type CartContextType = {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

/* ============================================================
   STORAGE KEY
   ============================================================ */

function getCartStorageKey(userId?: number) {
  return userId
    ? `royal_center_cart_user_${userId}`
    : "royal_center_cart_guest";
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // storageKey must NOT change during hydration
  const storageKeyRef = useRef<string | null>(null);

  /* ============================================================
     HYDRATION BARRIER
     ============================================================ */

  useEffect(() => {
    storageKeyRef.current = getCartStorageKey(user?.userId);
    setHydrated(true);
  }, [user?.userId]);

  /* ============================================================
     LOAD CART (CLIENT ONLY)
     ============================================================ */

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

  /* ============================================================
     PERSIST CART (CLIENT ONLY)
     ============================================================ */

  useEffect(() => {
    if (!hydrated || !storageKeyRef.current) return;
    localStorage.setItem(storageKeyRef.current, JSON.stringify(cart));
  }, [cart, hydrated]);

  function clearCart() {
    if (!storageKeyRef.current) return;
    setCart([]);
    localStorage.removeItem(storageKeyRef.current);
  }

  return (
    <CartContext.Provider value={{ cart, setCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
