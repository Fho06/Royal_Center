"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useRouter } from "next/navigation";

type Order = {
  id: number;
  total_amount: number;
  status: string;
  created_at: string;
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchOrders() {
      try {
        const data = await apiRequest("/orders");
        setOrders(data);
      } catch (err: any) {
        // If token is missing/invalid, redirect to login
        if (err.message.toLowerCase().includes("token")) {
          router.push("/login");
        } else {
          setError(err.message);
        }
      }
    }

    fetchOrders();
  }, [router]);

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="mb-6 text-2xl font-bold">Order History</h1>

      {error && <p className="text-red-600">{error}</p>}

      {orders.length === 0 && !error && (
        <p className="text-gray-500">You have no orders yet.</p>
      )}

      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="rounded border p-4 shadow-sm"
          >
            <div className="flex justify-between">
              <span className="font-semibold">
                Order #{order.id}
              </span>
              <span className="text-sm text-gray-500">
                {new Date(order.created_at).toLocaleString()}
              </span>
            </div>

            <p className="mt-2">
              Total: <strong>${order.total_amount.toFixed(2)}</strong>
            </p>

            <p className="text-sm text-gray-600">
              Status: {order.status}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
