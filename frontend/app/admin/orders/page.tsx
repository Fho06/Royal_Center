"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";

/* ---------- TYPES ---------- */

type Order = {
  order_number: string;

  email: string;
  phone: string;

  status: string;
  status_label: string;
  created_at: string;

  total_amount: number;
  subtotal: number;
  tax_amount: number;
  tip_amount: number;

  fulfillment_type: "delivery" | "pickup";
  payment_method: string;
  notes: string | null;

  address_label?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  municipio?: string;
  country?: string;
};

/* ---------- CONSTANTS ---------- */

const STATUSES = [
  "pending_payment",
  "under_review",
  "order_placed",
  "picking_up",
  "en_route",
  "delivered",
  "refunded",
  "cancelled",
];

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

/* ---------- COMPONENT ---------- */

export default function AdminOrdersPage() {
  const router = useRouter();
  const { loading: authLoading, isAuthenticated } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ---------- DATA ---------- */

  async function load() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);

      const data = await apiRequest(`/admin/orders?${params.toString()}`);
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err: any) {
      setError(err.message || "Failed to load admin orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(orderNumber: string, newStatus: string) {
    try {
      await apiRequest(`/admin/orders/${orderNumber}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      load();
    } catch {
      alert("Failed to update order status");
    }
  }

  /* ---------- AUTH + FETCH ---------- */

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    load();
  }, [authLoading, isAuthenticated, status]);

  /* ---------- STATES ---------- */

  if (authLoading || loading) {
    return <div className="p-6">Loading orders…</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  /* ---------- RENDER ---------- */

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-4">
      
      <h1 className="text-3xl font-bold text-center">
        Admin — Órdenes
      </h1>

      <select
        value={status}
        onChange={e => setStatus(e.target.value)}
        className="border px-3 py-2 cursor-pointer"
      >
        <option value="all">Todos</option>
        {STATUSES.map(s => (
          <option key={s} value={s}>
            {STATUS_LABELS_ES[s] ?? s}
          </option>
        ))}
      </select>

      <div className="space-y-4">
        {orders.map(o => (
          <div
            key={o.order_number}
            onClick={() =>
              router.push(`/admin/orders/${o.order_number}`)
            }
            className="checkout-card p-4 rounded space-y-1 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
          >
            <div className="flex justify-between">
              <p className="font-semibold">
                Orden #{o.order_number}
              </p>
              <p className="text-sm text-gray-500">
                {new Date(o.created_at).toLocaleString()}
              </p>
            </div>

            <p>
              <span className="font-medium">Teléfono:</span>{" "}
              {o.phone}
            </p>

            <p>
              <span className="font-medium">Estado:</span>{" "}
              {STATUS_LABELS_ES[o.status] ?? o.status}
            </p>

            <p className="font-bold">
              Total: Bs. {o.total_amount.toFixed(2)}
            </p>

            <div className="flex flex-wrap gap-2 mt-2">
              {STATUSES.map(s => (
                <button
                  key={`${o.order_number}-${s}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateStatus(o.order_number, s);
                  }}
                  className="reg-btn px-2 py-1 text-sm rounded hover:bg-gray-100"
                >
                  {STATUS_LABELS_ES[s] ?? s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
