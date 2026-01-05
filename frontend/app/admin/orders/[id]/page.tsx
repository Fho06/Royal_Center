"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await apiRequest(`/admin/orders/${id}`);
        setOrder(data.order);
        setItems(data.items);
      } catch (e: any) {
        setError(e.message || "Failed to load order");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!order) return null;

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-600 underline"
      >
        ← Back to orders
      </button>

      <h1 className="text-2xl font-bold">
        Order #{order.id}
      </h1>

      <section className="space-y-1">
        <p><b>User:</b> {order.email}</p>
        <p><b>Phone:</b> {order.phone}</p>
        <p><b>Status:</b> {order.status_label}</p>
        <p><b>Payment:</b> {order.payment_method}</p>
        <p><b>Fulfillment:</b> {order.fulfillment_type}</p>
      </section>

      {order.fulfillment_type === "delivery" && (
        <section className="space-y-1">
          <h2 className="font-semibold">Delivery Address</h2>
          <p>{order.address_1}</p>
          {order.address_2 && <p>{order.address_2}</p>}
          <p>
            {order.city}, {order.state}, {order.country}
          </p>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-2">Items</h2>
        <div className="space-y-2">
          {items.map(i => (
            <div key={i.item_id} className="border p-2 rounded">
              <p>{i.name}</p>
              <p className="text-sm">
                {i.quantity} × ${i.price.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="font-semibold space-y-1">
        <p>Subtotal: ${order.subtotal.toFixed(2)}</p>
        <p>Tax: ${order.tax_amount.toFixed(2)}</p>
        <p>Tip: ${order.tip_amount.toFixed(2)}</p>
        <p>Total: Bs. {order.total_amount.toFixed(2)}</p>
      </section>
    </main>
  );
}
