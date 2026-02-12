"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";

type Order = {
  order_number: string;

  phone: string | null;
  email: string | null;
  customer_name: string | null;
  rif: string | null;

  status: string;
  status_label: string;

  payment_method: string;
  fulfillment_type: "delivery" | "pickup";

  notes: string | null;

  subtotal: number | string | null;
  tax_amount: number | string | null;
  tip_amount: number | string | null;
  delivery_fee: number | string | null;
  total_amount: number | string | null;

  address_1?: string | null;
  address_2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

type Item = {
  item_id: number;
  name: string;
  quantity: number;
  price: number;
};

const STATUS_LABELS_ES: Record<string, string> = {
  pending_payment: "Pago Pendiente",
  under_review: "Bajo Revisión",
  order_placed: "Orden Aceptada",
  picking_up: "En Camino a la Tienda",
  en_route: "En Camino",
  delivered: "Entregado",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
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
  const FULFILLMENT_LABELS: Record<"pickup" | "delivery", string> = {
    pickup: "Retiro en tienda",
    delivery: "Entrega a domicilio",
  };


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
  const tip = toNumber(order.tip_amount);
  const delivery = toNumber(order.delivery_fee);
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
        <p><b>Cliente:</b> {order.customer_name || "—"}</p>
        <p><b>RIF:</b> {order.rif || "—"}</p>
        <p><b>Teléfono:</b> {order.phone || "—"}</p>
        <p><b>Email:</b> {order.email || "—"}</p>
        <p><b>Estado:</b>{" "}
              {STATUS_LABELS_ES[order.status] ?? order.status_label ?? order.status}</p>
        <p><b>Método de Pago:</b> {order.payment_method}</p>
        <p><b>Método de Entrega:</b>{" "}
          {FULFILLMENT_LABELS[order.fulfillment_type] ?? order.fulfillment_type}
        </p>
      </section>
      {order.notes && (
        <section className="space-y-1">
          <h2 className="font-semibold">Notas del Cliente</h2>
          <p className="italic border p-2 rounded bg-gray-50">
            {order.notes}
          </p>
        </section>
      )}


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
          {items.map((i, idx) => (
            <div
              key={`${i.item_id}-${idx}`}
              className="border p-2 rounded"
            >
              <p>{i.name}</p>
              <p className="text-sm">
                {i.quantity} × $ {i.price.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="font-semibold space-y-1">
        <p>Subtotal: $ {subtotal.toFixed(2)}</p>
        <p>Propina: $ {tip.toFixed(2)}</p>
        <p>Tarifa de entrega: $ {delivery.toFixed(2)}</p>
        <p>Total: Bs. {total.toFixed(2)}</p>
      </section>
    </main>
  );
}
