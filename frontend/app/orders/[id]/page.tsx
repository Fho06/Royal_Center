"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";

type OrderItem = {
  name: string;
  quantity: number;
  price: number;
};

type Order = {
  id: number;
  total_amount: number;
  status: string;
  created_at: string;
};

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }

    async function fetchOrder() {
      try {
        const data = await apiRequest(`/orders/${id}`);
        setOrder(data.order);
        setItems(data.items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [id, router]);

  if (loading) {
    return <p className="p-6">Loading order...</p>;
  }

  if (!order) {
    return <p className="p-6">Order not found.</p>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="mb-1 text-2xl font-bold">
        Order #{order.id}
      </h1>

      <p className="mb-2 text-sm text-gray-500">
        {new Date(order.created_at).toLocaleString()}
      </p>

      <p className="mb-6 text-sm">
        Status:{" "}
        <span className="font-semibold">
          {(order.status ?? "unknown").replace(/_/g, " ")}
        </span>
      </p>

      {/* PAYMENT CTA */}
      {order.status === "pending_payment" && (
        <div className="mb-6 rounded border border-yellow-400 bg-yellow-50 p-4">
          <p className="mb-3 font-medium">
            Payment required to complete this order.
          </p>
          <button
            onClick={() => router.push(`/checkout/pay/${order.id}`)}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Complete Payment
          </button>
        </div>
      )}

      {order.status === "under_review" && (
        <div className="mb-6 rounded border border-blue-400 bg-blue-50 p-4">
          <p className="font-medium">
            Payment submitted — awaiting verification.
          </p>
        </div>
      )}

      {order.status === "paid" && (
        <div className="mb-6 rounded border border-green-400 bg-green-50 p-4">
          <p className="font-medium">
            Payment confirmed. Order is being prepared.
          </p>
        </div>
      )}

      {/* ITEMS */}
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex justify-between rounded border p-3"
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

      <div className="mt-6 border-t pt-4 text-right">
        <p className="text-lg font-bold">
          Total: ${order.total_amount.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
