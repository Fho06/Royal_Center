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

const BANKS = [
  "Banco de Venezuela",
  "Banco Plaza",
  "Banesco",
  "Mercantil",
  "Provincial",
];

export default function PagoMovilPage() {
  const router = useRouter();
  const params = useParams();

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [senderBank, setSenderBank] = useState("");
  const [reference, setReference] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }

    if (!orderId) {
      setError("Orden inválida");
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
        setError(e.message || "Error cargando pago móvil");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [orderId, router]);

  async function submitPayment() {
    if (!order) return;

    if (!senderBank || !reference) {
      setError("Completa todos los campos requeridos");
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
          amount: order.total_amount, // exact amount enforced
          phone_last4: phoneLast4 || undefined,
        }),
      });

      router.push(`/orders/${order.id}`);
    } catch (e: any) {
      setError(e.message || "Error enviando el pago");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-6">Cargando pago móvil…</div>;
  if (!order) return <div className="p-6 text-red-600">{error}</div>;

  const account = accounts[0];

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Pago Móvil</h1>

      {/* WARNING */}
      <div className="flex items-center gap-3 rounded bg-yellow-50 border border-yellow-300 p-3 text-sm">
        ⚠️ Debes realizar el pago por el <strong>monto exacto</strong> o la orden
        no será procesada.
      </div>

      {error && (
        <div className="rounded border border-red-400 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* STEP 1 */}
        <section className="border rounded">
          <div className="bg-gray-50 border-b px-4 py-2 font-medium flex gap-2">
            <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-sm">
              1
            </span>
            Completa los datos de la cuenta con la que pagaste
          </div>

          <div className="p-4 space-y-4">
            <select
              value={senderBank}
              onChange={(e) => setSenderBank(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Selecciona tu banco</option>
              {BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <input
              placeholder="Referencia / N° de operación"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />

            <input
              placeholder="Últimos 4 dígitos del teléfono (opcional)"
              value={phoneLast4}
              onChange={(e) => setPhoneLast4(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </section>

        {/* STEP 2 */}
        <section className="border rounded">
          <div className="bg-gray-50 border-b px-4 py-2 font-medium flex gap-2">
            <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-sm">
              2
            </span>
            Datos para realizar el pago móvil
          </div>

          <div className="p-4 space-y-2 text-sm">
            <p>
              <strong>Monto:</strong>{" "}
              Bs. {order.total_amount.toFixed(2)}
            </p>

            {account && (
              <>
                <p>
                  <strong>Banco:</strong> {account.bank_name}
                </p>
                <p>
                  <strong>Teléfono:</strong> {account.phone}
                </p>
                <p>
                  <strong>RIF:</strong> {account.rif}
                </p>
                {account.beneficiary_name && (
                  <p>
                    <strong>Beneficiario:</strong>{" "}
                    {account.beneficiary_name}
                  </p>
                )}
              </>
            )}

            <button
              disabled={submitting}
              onClick={submitPayment}
              className="mt-4 w-full bg-black text-white py-2 rounded font-medium disabled:opacity-50"
            >
              Ya realicé el pago
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
