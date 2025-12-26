"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

type PaymentAccount = {
  id: number;
  bank_name: string;
  bank_code: string | null;
  phone: string;
  rif: string;
  beneficiary_name: string | null;
  currency: string;
};

type Order = {
  id: number;
  total_amount: number;
  status: string;
};

export default function PagoMovilPage() {
  const params = useParams();
    const orderId = Array.isArray(params.orderId)
    ? params.orderId[0]
    : params.orderId;
  if (!orderId) {
    return <div className="p-6 text-red-600">Invalid order ID</div>;
  }
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // payment form
  const [senderBank, setSenderBank] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        const [orderRes, accountsRes] = await Promise.all([
          apiRequest(`/orders/${orderId}`),
          apiRequest(`/payment-accounts?method=pago_movil`),
        ]);

        setOrder(orderRes.order ?? orderRes);
        setAccounts(accountsRes.accounts ?? []);
      } catch (e: any) {
        setError(e.message || "Failed to load payment info");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [orderId, router]);

async function submitPayment() {
  if (!order || !orderId) return;

  if (!senderBank || !reference || !amount) {
    setError("Please fill all required fields");
    return; // ⛔ STOP HERE
  }

  setSubmitting(true);
  setError("");

  try {
    await apiRequest("/payments/pago-movil", {
      method: "POST",
      body: JSON.stringify({
        order_id: order.id,
        sender_bank: senderBank,
        reference_number: reference,
        amount: Number(amount),
        phone_last4: phoneLast4 || undefined,
      }),
    });

    router.push(`/orders/${order.id}`);
  } catch (e: any) {
    setError(e.message || "Failed to submit payment");
  } finally {
    setSubmitting(false);
  }
}


  if (loading) {
    return <div className="p-6">Loading payment details…</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!order) {
    return <div className="p-6">Order not found</div>;
  }

  const account = accounts[0]; // single account for now

  return (
    <main className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Pago Móvil</h1>

      <div className="border rounded p-4 space-y-2">
        <p><strong>Order ID:</strong> {order.id}</p>
        <p><strong>Total:</strong> ${order.total_amount.toFixed(2)}</p>
        <p><strong>Status:</strong> {order.status}</p>
      </div>

      {account && (
        <div className="border rounded p-4 space-y-1">
          <h2 className="font-semibold mb-2">Send payment to:</h2>
          <p><strong>Bank:</strong> {account.bank_name}</p>
          <p><strong>Phone:</strong> {account.phone}</p>
          <p><strong>RIF:</strong> {account.rif}</p>
          {account.beneficiary_name && (
            <p><strong>Name:</strong> {account.beneficiary_name}</p>
          )}
        </div>
      )}

      <div className="border rounded p-4 space-y-3">
        <h2 className="font-semibold">Confirm Payment</h2>

        <input
          placeholder="Sender bank"
          value={senderBank}
          onChange={e => setSenderBank(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />

        <input
          placeholder="Reference number"
          value={reference}
          onChange={e => setReference(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />

        <input
          placeholder="Amount sent"
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />

        <input
          placeholder="Phone last 4 digits (optional)"
          value={phoneLast4}
          onChange={e => setPhoneLast4(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />

        <button
          disabled={submitting}
          onClick={submitPayment}
          className="w-full bg-black text-white py-2 rounded disabled:opacity-50"
        >
          Submit Payment
        </button>
      </div>
    </main>
  );
}
