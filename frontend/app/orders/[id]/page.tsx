"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { useParams, useRouter } from "next/navigation";

/* ---------- TYPES ---------- */

type OrderItem = {
  name: string;
  quantity: number;
  price: number;
};

type Order = {
  id: number;
  total_amount: number;
  status: string;
  status_label: string;
  created_at: string;
};

/* ---------- COMPONENT ---------- */

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const orderId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : null;

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ---------- AUTH + FETCH ---------- */

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }

    if (!orderId) {
      setError("Invalid order ID");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const data = await apiRequest(`/orders/${orderId}`);
        setOrder(data.order);
        setItems(data.items);
      } catch (err: any) {
        setError(err.message || "Failed to load order");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [orderId, router]);

  /* ---------- STATES ---------- */

  if (loading) {
    return <div className="p-6">Loading order…</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        {error}
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        Order not found.
      </div>
    );
  }

  /* ---------- RENDER ---------- */

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Order #{order.id}
        </h1>

        <p className="text-sm text-gray-500">
          {new Date(order.created_at).toLocaleString()}
        </p>

        <p className="mt-2 text-sm">
          Status:{" "}
          <span className="font-semibold">
            {order.status_label}
          </span>
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex justify-between border rounded p-3"
          >
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-gray-500">
                Qty: {item.quantity}
              </p>
            </div>

            <div className="text-right">
              <p>${item.price.toFixed(2)}</p>
              <p className="text-sm text-gray-500">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-4 text-right">
        <p className="text-lg font-bold">
          Total: ${order.total_amount.toFixed(2)}
        </p>
      </div>
    </main>
  );
}
