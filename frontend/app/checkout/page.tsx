"use client";

import { useCart } from "@/context/CartContext";
import { apiRequest } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CheckoutPage() {
  const { cart, setCart } = useCart();
  const router = useRouter();
  const [error, setError] = useState("");

  // Clear error when cart changes
  useEffect(() => {
    setError("");
  }, [cart]);

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  async function submitOrder() {
    if (cart.length === 0) {
      setError("Cart is empty");
      return;
    }

    try {
      const data = await apiRequest("/orders", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map(c => ({
            item_id: c.item_id,
            quantity: c.quantity,
          })),
        }),
      });

      router.push(`/checkout/pay/${data.orderId}`);
    } catch (err: any) {
      setError(err.message || "Failed to create order");
    }
  }

  /* ---------- CART CONTROLS (STOCK SAFE) ---------- */

  function increaseQty(itemId: string) {
    setCart(prev =>
      prev.map(item => {
        if (item.item_id !== itemId) return item;

        // 🛡️ Guard against missing stock
        if (typeof item.stock !== "number") return item;

        if (item.quantity >= item.stock) return item; // ⛔ block
        return { ...item, quantity: item.quantity + 1 };
      })
    );
  }

  function decreaseQty(itemId: string) {
    setCart(prev =>
      prev
        .map(item =>
          item.item_id === itemId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter(item => item.quantity > 0)
    );
  }

  function removeFromCart(itemId: string) {
    setCart(prev => prev.filter(item => item.item_id !== itemId));
  }

  function getRemainingStock(itemId: string) {
    const item = cart.find(i => i.item_id === itemId);
    if (!item || typeof item.stock !== "number") return 0;
    return item.stock - item.quantity;
  }

  /* ---------- RENDER ---------- */

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-4">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-600 underline"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold">Checkout</h1>

      {cart.length === 0 && (
        <p className="text-gray-500">Your cart is empty.</p>
      )}

      {cart.map(item => {
        const remaining = getRemainingStock(item.item_id);

        return (
          <div
            key={item.item_id}
            className="border-b py-3 space-y-1"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-500">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => decreaseQty(item.item_id)}
                  className="px-2 border rounded"
                >
                  −
                </button>

                <span>{item.quantity}</span>

                <button
                  onClick={() => increaseQty(item.item_id)}
                  disabled={remaining <= 0}
                  className="px-2 border rounded disabled:opacity-40"
                >
                  +
                </button>

                <button
                  onClick={() => removeFromCart(item.item_id)}
                  className="text-red-600 text-xs"
                >
                  Remove
                </button>
              </div>
            </div>

            {remaining <= 0 && (
              <p className="text-xs text-red-500">
                No more stock available
              </p>
            )}
          </div>
        );
      })}

      <p className="font-bold text-lg">
        Total: ${total.toFixed(2)}
      </p>

      <button
        onClick={submitOrder}
        disabled={cart.length === 0}
        className="w-full bg-black text-white py-2 rounded disabled:opacity-40"
      >
        Continue to Payment
      </button>

      {error && <p className="text-red-600">{error}</p>}
    </main>
  );
}
