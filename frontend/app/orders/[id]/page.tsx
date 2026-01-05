"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/app/context/AuthContext";
import { useParams, useRouter } from "next/navigation";

/* ---------- IMAGE HELPERS (SAME AS ProductTile) ---------- */

const IMAGE_BASE_URL =
  "https://pub-db262da1ef9140738af0ec8adade1c90.r2.dev/products";

const IMAGE_EXTENSIONS = ["jpeg", "jpg", "webp", "png", "jfif", "heic"];

/* ---------- TYPES ---------- */

type OrderItem = {
  item_id: string;
  name: string;
  quantity: number;
  price: number;
};

type Order = {
  id: number;
  total_amount: number;
  status: string;
  status_label: string;
  created_at: string;
};

/* ---------- READ-ONLY ROW (CHECKOUT STYLE) ---------- */

function OrderItemRow({ item }: { item: OrderItem }) {
  const [extIndex, setExtIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  const src = failed
    ? "/placeholder.png"
    : `${IMAGE_BASE_URL}/${item.item_id}/1.${IMAGE_EXTENSIONS[extIndex]}`;

  function onImgError() {
    if (extIndex < IMAGE_EXTENSIONS.length - 1) {
      setExtIndex(i => i + 1);
    } else {
      setFailed(true);
    }
  }

  return (
    <div className="flex gap-4 p-4 items-start">
      {/* IMAGE */}
      <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border">
        <Image
          src={src}
          alt={item.name}
          fill
          sizes="64px"
          onError={onImgError}
          className="object-contain"
        />
      </div>

      {/* INFO */}
      <div className="flex-1 min-w-0">
        <p className="font-medium leading-tight truncate">
          {item.name}
        </p>

        <p className="text-sm text-gray-500 mt-1">
          Qty: {item.quantity}
        </p>
      </div>

      {/* TOTAL */}
      <div className="text-right shrink-0">
        <p className="font-semibold">
          ${(item.price * item.quantity).toFixed(2)}
        </p>
        <p className="text-sm text-gray-500">
          ${item.price.toFixed(2)}
        </p>
      </div>
    </div>
  );
}

/* ---------- COMPONENT ---------- */

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { loading: authLoading, isAuthenticated } = useAuth();

  const orderId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : null;

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ---------- AUTH + FETCH ---------- */

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!orderId) {
      setError("Invalid order ID");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const data = await apiRequest(`/orders/${orderId}`);
        setOrder(data.order);
        setItems(data.items);
      } catch (err: any) {
        setError(err.message || "Failed to load order");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [authLoading, isAuthenticated, orderId, router]);

  /* ---------- STATES ---------- */

  if (authLoading || loading) {
    return <div className="p-6">Loading order…</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!order) {
    return <div className="p-6">Order not found.</div>;
  }

  /* ---------- RENDER ---------- */

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6 mt-3">
      {/* HEADER (UNCHANGED) */}
      <div>
        <h1 className="text-2xl font-bold">
          Order #{order.id}
        </h1>

        <p className="text-sm text-gray-500">
          {new Date(order.created_at).toLocaleString()}
        </p>

        <p className="mt-2 text-md">
          Status:{" "}
          <span className="font-semibold">
            {order.status_label}
          </span>
        </p>
      </div>

      {/* PRODUCT LIST — ONLY PART THAT CHANGED */}
      <div className="checkout-card overflow-hidden divide-y divide-gray-100">
        {items.map((item, index) => (
          <OrderItemRow
            key={`${order.id}-${item.item_id ?? "item"}-${index}`}
            item={item}
          />
        ))}
      </div>

      {/* TOTAL (UNCHANGED) */}
      <div className="border-t pt-4 text-right">
        <p className="text-lg font-bold">
          Total: Bs. {order.total_amount.toFixed(2)}
        </p>
      </div>
    </main>
  );
}
