"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";

/* ---------- TYPES ---------- */

type Payment = {
  id: number;
  order_id: number;
  email: string;
  amount: number;
  sender_bank: string;
  reference_number: string;
  phone_last4: string | null;
};

/* ---------- COMPONENT ---------- */

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { loading: authLoading, isAuthenticated } = useAuth();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await apiRequest("/admin/payments");
    setPayments(data.payments);
    setLoading(false);
  }

  async function act(id: number, action: "approve" | "reject") {
    await apiRequest(`/admin/payments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action }),
    });
    load();
  }

  /* ---------- AUTH + FETCH ---------- */

  useEffect(() => {
    // ⛔ wait until auth is resolved
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    load();
  }, [authLoading, isAuthenticated, router]);

  /* ---------- STATES ---------- */

  if (authLoading || loading) {
    return <div className="p-6">Loading payments…</div>;
  }

  /* ---------- RENDER ---------- */

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Admin — Payments
      </h1>

      {payments.length === 0 && (
        <p className="text-gray-500">
          No pending payments.
        </p>
      )}

      <div className="space-y-4">
        {payments.map(p => (
          <div key={p.id} className="border p-4 rounded">
            <p className="font-semibold">
              Payment #{p.id}
            </p>
            <p>Usuario: {p.email}</p>
            <p>Orden: #{p.order_id}</p>
            <p>Banco: {p.sender_bank}</p>
            <p>Ref: {p.reference_number}</p>
            <p>
              Monto: ${p.amount.toFixed(2)}
            </p>
            {p.phone_last4 && (
              <p>Teléfono: ****{p.phone_last4}</p>
            )}

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => act(p.id, "approve")}
                className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              >
                Aprovar
              </button>
              <button
                onClick={() => act(p.id, "reject")}
                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              >
                Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
