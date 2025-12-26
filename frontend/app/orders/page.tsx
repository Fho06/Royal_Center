"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useRouter } from "next/navigation";

type Order = {
  id: number;
  total_amount: number;
  status: string;
  status_label: string;
  created_at: string;
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        if (status !== "all") params.set("status", status);

        const data = await apiRequest(`/orders?${params.toString()}`);

        // ✅ CRITICAL LINE
        setOrders(Array.isArray(data.orders) ? data.orders : []);
      } catch (err: any) {
        setError(err.message || "Failed to load orders");
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [status]);

  if (loading) {
    return <div className="p-6">Loading orders…</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Orders</h1>

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="border rounded px-3 py-2 mb-4"
      >
        <option value="all">All</option>
        <option value="pending_payment">Pago Pendiente</option>
        <option value="under_review">En Revisión</option>
        <option value="order_placed">Pedido Realizado</option>
        <option value="picking_up">Buscando Tu Orden</option>
        <option value="picked_up">En Camino</option>
        <option value="delivered">Entregado</option>
      </select>

      {orders.length === 0 && (
        <p className="text-gray-500">No orders found.</p>
      )}

      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            onClick={() => router.push(`/orders/${order.id}`)}
            className="border rounded p-4 cursor-pointer hover:bg-gray-50"
          >
            <p className="font-semibold">Order #{order.id}</p>
            <p>Status: {order.status_label}</p>
            <p>Total: ${order.total_amount.toFixed(2)}</p>
            <p className="text-sm text-gray-500">
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
