"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

type Order = {
  order_number: string;
  total_amount: number;
  status: string;
  status_label: string;
  created_at: string;
  phone: string;
};

export default function OrdersPage() {
  const router = useRouter();
  const { loading: authLoading, isAuthenticated } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    async function load() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        if (status !== "all") params.set("status", status);

        const data = await apiRequest(`/orders?${params.toString()}`);
        setOrders(Array.isArray(data.orders) ? data.orders : []);
      } catch (err: any) {
        setError(err.message || "Failed to load orders");
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [status, authLoading, isAuthenticated, router]);

  if (authLoading || loading) {
    return <div className="p-6">Loading orders…</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Ordenes</h1>

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="checkout-card px-3 py-2 mb-4"
      >
        <option value="all">Todas</option>
        <option value="under_review">En Revisión</option>
        <option value="order_placed">Pedido Realizado</option>
        <option value="picking_up">Buscando Tu Orden</option>
        <option value="picked_up">En Camino</option>
        <option value="delivered">Entregado</option>
      </select>

      {orders.length === 0 && (
        <p className="text-gray-500">No tienes órdenes aún.</p>
      )}

      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.order_number}
            onClick={() => router.push(`/orders/${order.order_number}`)}
            className="checkout-card p-4 cursor-pointer hover:bg-gray-50"
          >
            <p className="font-semibold">
              Orden #{order.order_number}
            </p>
            <p>Estado: {order.status_label}</p>
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
