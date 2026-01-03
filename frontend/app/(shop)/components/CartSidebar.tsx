"use client";

import { useRouter } from "next/navigation";
import type { CartItem } from "@/app/context/CartContext";

type Props = {
  cart: CartItem[];
  total: number;
  increase: (itemId: string) => void;
  decrease: (itemId: string) => void;
  remove: (itemId: string) => void;
};

export function CartSidebar({
  cart,
  total,
  increase,
  decrease,
  remove,
}: Props) {
  const router = useRouter();

  return (
    <div className="cart-sidebar">
      <aside className="rounded-2xl bg-white p-4 elevation-strong">
        <h2 className="text-lg font-semibold mb-2 text-black">
          Carrito
        </h2>

        {cart.length === 0 && (
          <p className="text-gray-500 text-sm">
            El carrito está vacío
          </p>
        )}

        <div className="space-y-3">
          {cart.map((item) => (
            <div
              key={item.item_id}
              className="flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-black">
                  {item.name}
                </div>
                <div className="text-xs text-gray-500">
                  ${(item.price * item.quantity).toFixed(2)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Quantity */}
                <div className="flex items-center rounded-xl border border-gray-200 bg-white">
                  <button
                    onClick={() => decrease(item.item_id)}
                    className="h-8 w-8 rounded-l-xl hover:bg-black/5"
                  >
                    −
                  </button>

                  <span className="w-8 text-center text-sm font-semibold text-black">
                    {item.quantity}
                  </span>

                  <button
                    onClick={() => increase(item.item_id)}
                    className="h-8 w-8 rounded-r-xl hover:bg-black/5"
                  >
                    +
                  </button>
                </div>

                {/* Remove */}
                <button
                  onClick={() => remove(item.item_id)}
                  className="h-8 w-8 rounded-xl border border-gray-200 hover:bg-black/5"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-gray-200 pt-3">
          <p className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Total</span>
            <span className="font-semibold text-black">
              ${total.toFixed(2)}
            </span>
          </p>

          <button
            onClick={() => router.push("/checkout")}
            className="mt-3 w-full rounded-xl bg-[var(--reg-accent)] !text-white py-3 text-sm font-semibold hover:brightness-95"
          >
            Continuar al Carrito
          </button>
        </div>
      </aside>
    </div>
  );
}
