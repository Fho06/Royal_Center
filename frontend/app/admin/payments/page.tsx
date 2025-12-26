"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

type Payment = {
  id: number;
  order_id: number;
  email: string;
  amount: number;
  sender_bank: string;
  reference_number: string;
  phone_last4: string | null;
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);

  async function load() {
    const data = await apiRequest("/admin/payments");
    setPayments(data.payments);
  }

  async function act(id: number, action: "approve" | "reject") {
    await apiRequest(`/admin/payments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action }),
    });
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin — Payments</h1>

      {payments.length === 0 && (
        <p className="text-gray-500">No pending payments.</p>
      )}

      <div className="space-y-4">
        {payments.map(p => (
          <div key={p.id} className="border p-4 rounded">
            <p className="font-semibold">Payment #{p.id}</p>
            <p>User: {p.email}</p>
            <p>Order: #{p.order_id}</p>
            <p>Bank: {p.sender_bank}</p>
            <p>Ref: {p.reference_number}</p>
            <p>Amount: ${p.amount.toFixed(2)}</p>
            {p.phone_last4 && <p>Phone: ****{p.phone_last4}</p>}

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => act(p.id, "approve")}
                className="bg-green-600 text-white px-3 py-1 rounded"
              >
                Approve
              </button>
              <button
                onClick={() => act(p.id, "reject")}
                className="bg-red-600 text-white px-3 py-1 rounded"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
