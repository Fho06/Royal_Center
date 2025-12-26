"use client";

import { createContext, useContext, useEffect, useState } from "react";

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
};

const CartContext = createContext<CartContextType | null>(null);

const CART_STORAGE_KEY = "royal_center_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  // 🔹 Load cart on first mount
  useEffect(() => {
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
  }, []);

  // 🔹 Save cart whenever it changes
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  // 🔹 Clear cart on logout
  useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) {
    setCart([]);
  }
}, []);


  return (
    <CartContext.Provider value={{ cart, setCart }}>
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
