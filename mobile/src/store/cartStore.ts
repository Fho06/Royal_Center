import { create } from "zustand";
import { Item } from "../types/item";

export type CartItem = {
  item: Item;
  quantity: number;
};

type CartState = {
  items: CartItem[];

  // selectors
  getQuantity: (itemId: string) => number;

  // actions
  addItem: (item: Item) => void;
  removeItem: (itemId: string) => void;
  increment: (itemId: string) => void;
  decrement: (itemId: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  // 🔍 quantity of an item currently in cart
  getQuantity: (itemId) =>
    get().items.find((i) => i.item.id === itemId)?.quantity ?? 0,

  // ➕ add item (or increment if exists)
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find(
        (i) => i.item.id === item.id
      );

      if (existing) {
        // soft stock guard
        if (existing.quantity >= item.stock) return state;

        return {
          items: state.items.map((i) =>
            i.item.id === item.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }

      return {
        items: [...state.items, { item, quantity: 1 }],
      };
    }),

  // ➕ increment quantity
  increment: (itemId) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.item.id === itemId && i.quantity < i.item.stock
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ),
    })),

  // ➖ decrement quantity (removes item if reaches 0)
  decrement: (itemId) =>
    set((state) => ({
      items: state.items
        .map((i) =>
          i.item.id === itemId
            ? { ...i, quantity: i.quantity - 1 }
            : i
        )
        .filter((i) => i.quantity > 0),
    })),

  // ❌ remove item entirely
  removeItem: (itemId) =>
    set((state) => ({
      items: state.items.filter((i) => i.item.id !== itemId),
    })),

  // 🧹 clear cart
  clear: () => set({ items: [] }),
}));
