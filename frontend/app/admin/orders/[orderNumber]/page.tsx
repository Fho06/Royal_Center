"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";

type Order = {
  order_number: string;
  email: string;
  phone: string;
  status: string;
  status_label: string;
  created_at: string;

  subtotal: number | string | null;
  tax_amount: number | string | null;
  tip_amount: number | string | null;
  total_amount: number | string | null;

  fulfillment_type: "delivery" | "pickup";
  payment_method: string;

  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  country?: string;
};

type Item = {
  item_id: number;
  name: string;
  quantity: number;
  price: number;
};

function toNumber(value: number | string | null | undefined) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();

  const orderNumber =
    typeof params.orderNumber === "string"
      ? params.orderNumber
      : Array.isArray(params.orderNumber)
      ? params.orderNumber[0]
      : null;

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderNumber) {
      setError("Invalid order number");
      setLoading(false);
      return;
    }


    async function load() {
      try {
        const data = await apiRequest(
          `/admin/orders/${orderNumber}`
        );

        setOrder(data.order);
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (e: any) {
        setError(e.message || "Failed to load order");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [orderNumber]);
  
  

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!order) return null;

  const subtotal = toNumber(order.subtotal);
  const tax = toNumber(order.tax_amount);
  const tip = toNumber(order.tip_amount);
  const total = toNumber(order.total_amount);

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => router.back()}
        className="text-md text-gray-600 underline"
      >
        ← Regresar a Órdenes
      </button>

      <h1 className="text-2xl font-bold">
        Orden #{order.order_number}
      </h1>

      <section className="space-y-1">
        <p><b>Teléfono:</b> {order.phone}</p>
        <p><b>Email:</b> {order.email}</p>
        <p><b>Estado:</b> {order.status_label}</p>
        <p><b>Método de Pago:</b> {order.payment_method}</p>
        <p><b>Método de Entrega:</b> {order.fulfillment_type}</p>
      </section>

      {order.fulfillment_type === "delivery" && (
        <section className="space-y-1">
          <h2 className="font-semibold">DIRECCIÓN</h2>
          <p>{order.address_1}</p>
          {order.address_2 && <p>{order.address_2}</p>}
          <p>
            {order.city}, {order.state}, {order.country}
          </p>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-2">Artículos</h2>
        <div className="space-y-2">
          {items.map(i => (
            <div
              key={i.item_id}
              className="border p-2 rounded"
            >
              <p>{i.name}</p>
              <p className="text-sm">
                {i.quantity} × Bs. {i.price.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="font-semibold space-y-1">
        <p>Subtotal: Bs. {subtotal.toFixed(2)}</p>
        <p>Tax: Bs. {tax.toFixed(2)}</p>
        <p>Tip: Bs. {tip.toFixed(2)}</p>
        <p>Total: Bs. {total.toFixed(2)}</p>
      </section>
    </main>
  );
}
