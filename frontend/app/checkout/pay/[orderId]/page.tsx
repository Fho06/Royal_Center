"use client";

import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { useParams, useRouter } from "next/navigation";

type Order = {
  id: number;
  total_amount: number;
  status: string;
};

type PaymentAccount = {
  id: number;
  bank_name: string;
  phone: string;
  rif: string;
  beneficiary_name: string | null;
};

export default function PagoMovilPage() {
  const router = useRouter();
  const params = useParams();

  // 🔒 Freeze orderId ONCE (type-safe)
  const orderIdRef = useRef<string | null>(null);

  if (orderIdRef.current === null) {
    const raw = params.orderId;
    orderIdRef.current =
      typeof raw === "string"
        ? raw
        : Array.isArray(raw)
        ? raw[0]
        : null;
  }

  const orderId = orderIdRef.current;

  const [order, setOrder] = useState<Order | null>(null);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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

    if (!orderId) {
      setError("Invalid order ID");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const [orderRes, accountsRes] = await Promise.all([
          apiRequest(`/orders/${orderId}`),
          apiRequest(`/payment-accounts?method=pago_movil`),
        ]);

        setOrder(orderRes.order);
        setAccounts(accountsRes.accounts || []);
      } catch (e: any) {
        setError(e.message || "Failed to load payment info");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [orderId, router]);

  async function submitPayment() {
    if (!order) return;

    if (!senderBank || !reference || !amount) {
      setError("Please fill all required fields");
      return;
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
      setCart([]);
      router.push(`/orders/${order.id}`);
    } catch (e: any) {
      setError(e.message || "Payment submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-6">Loading payment details…</div>;
  }

  if (!order) {
    return <div className="p-6 text-red-600">{error || "Order not found"}</div>;
  }

  const account = accounts[0];

  return (
    <main className="p-6 max-w-xl mx-auto space-y-6">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-600 underline mb-4"
      >
        ← Back
      </button>
      <h1 className="text-2xl font-semibold">Pago Móvil</h1>

      {error && (
        <div className="rounded border border-red-400 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      <div className="border rounded p-4 space-y-1">
        <p><strong>Order ID:</strong> {order.id}</p>
        <p><strong>Total:</strong> ${order.total_amount.toFixed(2)}</p>
        <p><strong>Status:</strong> {order.status}</p>
      </div>

      {account && (
        <div className="border rounded p-4 space-y-1">
          <p><strong>Bank:</strong> {account.bank_name}</p>
          <p><strong>Phone:</strong> {account.phone}</p>
          <p><strong>RIF:</strong> {account.rif}</p>
          {account.beneficiary_name && (
            <p><strong>Name:</strong> {account.beneficiary_name}</p>
          )}
        </div>
      )}

      <div className="border rounded p-4 space-y-3">
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
          placeholder="Amount"
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
function setCart(arg0: never[]) {
  throw new Error("Function not implemented.");
}

