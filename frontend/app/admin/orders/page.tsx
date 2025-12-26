"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

type Order = {
  id: number;
  email: string;
  total_amount: number;
  status: string;
  status_label: string;
};

const STATUSES = [
  "pending_payment",
  "under_review",
  "order_placed",
  "picking_up",
  "picked_up",
  "delivered",
  "cancelled",
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("all");

  async function load() {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);

    const data = await apiRequest(`/admin/orders?${params}`);
    setOrders(data.orders);
  }

  async function updateStatus(orderId: number, status: string) {
    await apiRequest(`/admin/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    load();
  }

  useEffect(() => {
    load();
  }, [status]);

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin — Orders</h1>

      <select
        value={status}
        onChange={e => setStatus(e.target.value)}
        className="border px-3 py-2 mb-4"
      >
        <option value="all">All</option>
        {STATUSES.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <div className="space-y-4">
        {orders.map(o => (
          <div key={o.id} className="border p-4 rounded">
            <p className="font-semibold">Order #{o.id}</p>
            <p>User: {o.email}</p>
            <p>Status: {o.status_label}</p>
            <p>Total: ${o.total_amount.toFixed(2)}</p>

            <div className="flex gap-2 mt-2">
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => updateStatus(o.id, s)}
                  className="border px-2 py-1 text-sm rounded"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
