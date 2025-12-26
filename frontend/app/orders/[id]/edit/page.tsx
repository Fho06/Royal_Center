"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

type OrderItem = {
  item_id: string;
  name: string;
  quantity: number;
  price: number;
};

export default function EditOrderPage() {
  const router = useRouter();
  const { id } = useParams();
  const { loading: authLoading, isAuthenticated } = useAuth();

  const [items, setItems] = useState<OrderItem[]>([]);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        const data = await apiRequest(`/orders/${id}`);
        setItems(
          data.items.map((i: any) => ({
            item_id: i.item_id ?? "",
            name: i.name,
            quantity: i.quantity,
            price: i.price,
          }))
        );
        setStatus(data.order.status);
      } catch (err: any) {
        setError(err.message || "Failed to load order");
      }
    }

    load();
  }, [authLoading, isAuthenticated, id, router]);

  function updateQty(index: number, delta: number) {
    setItems(prev =>
      prev.map((item, i) =>
        i === index
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index));
  }

  async function saveChanges() {
    try {
      await apiRequest(`/orders/${id}/items`, {
        method: "PUT",
        body: JSON.stringify({
          items: items.map(i => ({
            item_id: i.item_id,
            quantity: i.quantity,
          })),
        }),
      });
      alert("Order updated");
    } catch (err: any) {
      setError(err.message || "Failed to save");
    }
  }

  async function finalizeOrder() {
    try {
      await apiRequest(`/orders/${id}/finalize`, { method: "POST" });
      router.push(`/checkout/pay/${id}`);
    } catch (err: any) {
      setError(err.message || "Failed to finalize");
    }
  }

  if (status !== "draft") {
    return (
      <div className="p-6">
        This order can no longer be edited.
      </div>
    );
  }

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Edit Order</h1>

      {items.map((item, index) => (
        <div key={index} className="border p-3 rounded flex justify-between">
          <div>
            <p className="font-medium">{item.name}</p>
            <p>${item.price.toFixed(2)}</p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => updateQty(index, -1)}>-</button>
            <span>{item.quantity}</span>
            <button onClick={() => updateQty(index, 1)}>+</button>
            <button
              onClick={() => removeItem(index)}
              className="text-red-600"
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <div className="flex gap-3">
        <button
          onClick={saveChanges}
          className="bg-gray-200 px-4 py-2 rounded"
        >
          Save Changes
        </button>

        <button
          onClick={finalizeOrder}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Finalize & Pay
        </button>
      </div>

      {error && <p className="text-red-600">{error}</p>}
    </main>
  );
}
