"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
   CART STORAGE KEY RESOLUTION
   ============================================================
   - Guest users get a guest cart
   - Logged-in users get their own cart
   ============================================================ */

function getCartStorageKey(userId?: number) {
  return userId
    ? `royal_center_cart_user_${userId}`
    : "royal_center_cart_guest";
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const storageKey = getCartStorageKey(user?.userId);

  const [cart, setCart] = useState<CartItem[]>([]);

  /* ============================================================
     LOAD CART WHEN USER CHANGES
     ============================================================ */

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      setCart([]);
      return;
    }

    try {
      setCart(JSON.parse(stored));
    } catch {
      localStorage.removeItem(storageKey);
      setCart([]);
    }
  }, [storageKey]);

  /* ============================================================
     PERSIST CART
     ============================================================ */

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(cart));
  }, [cart, storageKey]);

  function clearCart() {
    setCart([]);
    localStorage.removeItem(storageKey);
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
