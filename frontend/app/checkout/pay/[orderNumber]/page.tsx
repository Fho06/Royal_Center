"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { useParams, useRouter } from "next/navigation";
import { useCart } from "@/app/context/CartContext";

type Order = {
  order_number: string;
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
  const { setCart } = useCart();

  // ✅ PARAM MUST MATCH FOLDER NAME: [orderNumber]
  const orderNumber =
    typeof params.orderNumber === "string"
      ? params.orderNumber
      : Array.isArray(params.orderNumber)
      ? params.orderNumber[0]
      : null;

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

    if (!orderNumber) {
      setError("Orden inválida");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const [orderRes, accountsRes] = await Promise.all([
          apiRequest(`/orders/${orderNumber}`),
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
  }, [orderNumber, router]);

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
          order_number: order.order_number,
          sender_bank: senderBank,
          reference_number: reference,
          amount: order.total_amount,
          phone_last4: phoneLast4 || undefined,
        }),
      });

      setCart([]);
      router.push(`/orders/${order.order_number}`);
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
    <main className="mx-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Pago Móvil</h1>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* STEP 1 */}
          <section className="bg-white rounded-xl elevation-xl md:col-span-2">
            <div className="bg-[var(--reg-accent-soft)] px-4 py-3 font-semibold flex gap-3 items-center">
              <span className="w-6 h-6 rounded-full bg-[var(--reg-accent)] text-white flex items-center justify-center text-sm font-bold">
                1
              </span>
              Completa los datos de la cuenta con la que pagaste
            </div>

            <div className="p-3 space-y-3 text-sm">
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
                placeholder="Últimos 4 dígitos del teléfono"
                value={phoneLast4}
                onChange={(e) => setPhoneLast4(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </section>

          {/* STEP 2 */}
          <section className="bg-white rounded-xl elevation-xl md:col-span-2">
            <div className="bg-[var(--reg-accent-soft)] px-4 py-3 font-semibold flex gap-3 items-center">
              <span className="w-6 h-6 rounded-full bg-[var(--reg-accent)] text-white flex items-center justify-center text-sm font-bold">
                2
              </span>
              Datos para realizar el pago móvil
            </div>

            <div className="p-4 space-y-2.5 text-sm">
              <p>
                <strong>Monto: Bs. {order.total_amount.toFixed(2)}</strong>
              </p>

              {account && (
                <>
                  <p><strong>Banco:</strong> {account.bank_name}</p>
                  <p><strong>Teléfono:</strong> {account.phone}</p>
                  <p><strong>RIF:</strong> {account.rif}</p>
                  {account.beneficiary_name && (
                    <p><strong>Beneficiario:</strong> {account.beneficiary_name}</p>
                  )}
                </>
              )}

              <button
                disabled={submitting}
                onClick={submitPayment}
                className="mt-3 w-full reg-btn text-white py-2 rounded-lg font-bold disabled:opacity-50"
              >
                Ya realicé el pago
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
