"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";

type Order = {
  id: number;
  total_amount: number;
  created_at: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }

    async function fetchOrders() {
      try {
        const data = await apiRequest("/orders");
        setOrders(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  if (loading) {
    return <p className="p-6">Loading orders...</p>;
  }

  if (orders.length === 0) {
    return <p className="p-6">You have no orders yet.</p>;
  }

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Your Orders</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            onClick={() => router.push(`/orders/${order.id}`)}
            className="cursor-pointer rounded border p-4 hover:bg-gray-50"
          >
            <p>
              <strong>Order #{order.id}</strong>
            </p>
            <p>Total: ${order.total_amount.toFixed(2)}</p>
            <p className="text-sm text-gray-500">
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
