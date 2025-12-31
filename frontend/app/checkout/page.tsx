"use client";

import { useCart } from "@/app/context/CartContext";
import { apiRequest } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AddressModal } from "@/app/account/components/AddressModal";
import { CartItemRow } from "./CartItemRow";
import { EmptyCart } from "./EmptyCart";
import { AddressSelector } from "./AddressSelector";
import { AnimatedDropdown } from "@/app/components/AnimatedDropdown";

const TIP_PRESETS = [0, 0.5, 1, 1.5, 2];
type Step = "checkout" | "review";
type PickupLocation = "royal_center_main";

export default function CheckoutPage() {
  const { cart, setCart } = useCart();
  const router = useRouter();

  const [step, setStep] = useState<Step>("checkout");

  const [productsOpen, setProductsOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(true);
  const [deliveryOpen, setDeliveryOpen] = useState(true);

  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);

  const [fulfillmentType, setFulfillmentType] = useState<"delivery" | "pickup">("delivery");

  const [pickupLocation, setPickupLocation] = useState<PickupLocation>("royal_center_main");

  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function loadAddresses(autoSelectNewest = false) {
    const data = await apiRequest("/addresses");
    const list = data.addresses ?? [];
    setAddresses(list);

    if (!selectedAddressId) {
      const def = list.find((a: any) => a.is_default);
      if (def) setSelectedAddressId(def.address_id);
    }

    if (autoSelectNewest && list.length > 0) {
      setSelectedAddressId(list.at(-1).address_id);
    }
  }

  useEffect(() => {
    loadAddresses();
  }, []);

  function increaseQty(id: string) {
    setCart(c =>
      c.map(i =>
        i.item_id === id && i.quantity < i.stock
          ? { ...i, quantity: i.quantity + 1 }
          : i
      )
    );
  }

  function decreaseQty(id: string) {
    setCart(c =>
      c
        .map(i =>
          i.item_id === id ? { ...i, quantity: i.quantity - 1 } : i
        )
        .filter(i => i.quantity > 0)
    );
  }

  function removeFromCart(id: string) {
    setCart(c => c.filter(i => i.item_id !== id));
  }

  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + i.price * i.quantity, 0),
    [cart]
  );

  const total = subtotal + tip;

  function handleGoToReview() {
    setError("");

    if (cart.length === 0) return;

    if (fulfillmentType === "delivery" && !selectedAddressId) {
      setError("Debes seleccionar una dirección");
      setShowAddressModal(true);
      return;
    }

    setProductsOpen(false);
    setStep("review");
  }

  async function confirmOrder() {
    setSubmitting(true);
    setError("");

    try {
      const res = await apiRequest("/orders", {
        method: "POST",
        body: JSON.stringify({
          fulfillment_type: fulfillmentType,
          pickup_location:
            fulfillmentType === "pickup" ? pickupLocation : null,
          address_id:
            fulfillmentType === "delivery" ? selectedAddressId : null,
          items: cart.map(i => ({
            item_id: i.item_id,
            quantity: i.quantity,
          })),
          tip_amount: fulfillmentType === "delivery" ? tip : 0,
          notes,
        }),
      });

      router.push(`/checkout/pay/${res.orderId}`);
    } catch (e: any) {
      setError(e.message || "Error al crear la orden");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT */}
      <section className="lg:col-span-2 space-y-4">
        <h1 className="text-2xl font-bold">Checkout</h1>

        {step === "checkout" ? (
          cart.length === 0 ? (
            <EmptyCart />
          ) : (
            cart.map(item => (
              <CartItemRow
                key={item.item_id}
                item={item}
                increaseQty={increaseQty}
                decreaseQty={decreaseQty}
                removeFromCart={removeFromCart}
              />
            ))
          )
        ) : (
          <div className="border rounded-lg">
            <button
              onClick={() => setProductsOpen(v => !v)}
              className="w-full flex justify-between items-center p-4 font-semibold"
            >
              <span>Productos ({cart.length})</span>
              <span className={`transition-transform ${productsOpen ? "rotate-180" : ""}`}>
                ▾
              </span>
            </button>

            <AnimatedDropdown open={productsOpen}>
              <div className="border-t p-4 space-y-3">
                {cart.map(item => (
                  <CartItemRow
                    key={item.item_id}
                    item={item}
                    increaseQty={() => {}}
                    decreaseQty={() => {}}
                    removeFromCart={() => {}}
                  />
                ))}
              </div>
            </AnimatedDropdown>
          </div>
        )}

        {/* REVIEW ONLY */}
        {step === "review" && (
          <>
            <AnimatedDropdown open={fulfillmentType === "pickup"}>
              <div className="border rounded-lg p-4 space-y-2">
                <div className="font-semibold">Lugar de retiro</div>
                <select
                  value={pickupLocation}
                  onChange={e =>
                    setPickupLocation(e.target.value as PickupLocation)
                  }
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="royal_center_main">
                    Royal Center – Principal
                  </option>
                </select>
              </div>
            </AnimatedDropdown>

            <AnimatedDropdown
              open={step === "review" && fulfillmentType === "delivery"}
            >
              <div className="border rounded-lg p-4 space-y-2">
                <div className="font-semibold">Propina</div>
                <div className="flex gap-2 flex-wrap">
                  {TIP_PRESETS.map(v => (
                    <button
                      key={v}
                      onClick={() => {
                        setTip(v);
                        setCustomTip("");
                      }}
                      className={`px-3 py-1 border rounded ${
                        tip === v ? "bg-blue-600 text-white" : ""
                      }`}
                    >
                      REF {v.toFixed(2)}
                    </button>
                  ))}
                  <input
                    type="number"
                    placeholder="Otro"
                    value={customTip}
                    onChange={e => {
                      setCustomTip(e.target.value);
                      setTip(Number(e.target.value) || 0);
                    }}
                    className="border rounded px-2 w-24"
                  />
                </div>
              </div>
            </AnimatedDropdown>

            <AnimatedDropdown open={step === "review"}>
              <div className="border rounded-lg p-4">
                <div className="font-semibold mb-1">Notas</div>
                <textarea
                  value={notes}
                  placeholder={
                    fulfillmentType === "delivery"
                      ? "Ejemplo: entregar a la puerta"
                      : "Notas adicionales"
                  }
                  onChange={e => setNotes(e.target.value)}
                  className="w-full border rounded p-2"
                />
              </div>
            </AnimatedDropdown>
          </>
        )}
      </section>

      {/* RIGHT */}
      <aside className="border rounded-lg p-4 space-y-4 h-fit">
        <h2 className="text-lg font-semibold">Resumen del pedido</h2>

        {/* ENTREGA */}
        <div className="border rounded-lg">
          <button
            onClick={() => setDeliveryOpen(v => !v)}
            className="w-full flex justify-between items-center p-4 font-semibold"
          >
            <span>Entrega</span>
            <span className={`transition-transform ${deliveryOpen ? "rotate-180" : ""}`}>
              ▾
            </span>
          </button>

          <AnimatedDropdown open={deliveryOpen}>
            <div className="border-t p-4 space-y-2 text-sm">
              <label className="flex gap-2">
                <input
                  type="radio"
                  checked={fulfillmentType === "delivery"}
                  onChange={() => setFulfillmentType("delivery")}
                />
                Delivery
              </label>
              <label className="flex gap-2">
                <input
                  type="radio"
                  checked={fulfillmentType === "pickup"}
                  onChange={() => setFulfillmentType("pickup")}
                />
                Pick Up
              </label>
            </div>
          </AnimatedDropdown>
        </div>

        {/* DIRECCIÓN */}
        {fulfillmentType === "delivery" && (
          <div className="border rounded-lg">
            <button
              onClick={() => setAddressOpen(v => !v)}
              className="w-full flex justify-between items-center p-4 font-semibold"
            >
              <span>Dirección</span>
              <span className={`transition-transform ${addressOpen ? "rotate-180" : ""}`}>
                ▾
              </span>
            </button>

            <AnimatedDropdown open={addressOpen}>
              <div className="border-t p-4">
                <AddressSelector
                  addresses={addresses}
                  selectedAddressId={selectedAddressId}
                  setSelectedAddressId={setSelectedAddressId}
                  onAdd={() => {
                    setEditingAddress(null);
                    setShowAddressModal(true);
                  }}
                  onEdit={addr => {
                    setEditingAddress(addr);
                    setShowAddressModal(true);
                  }}
                />
              </div>
            </AnimatedDropdown>
          </div>
        )}

        <hr />

        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span>Propina</span>
          <span>${tip.toFixed(2)}</span>
        </div>

        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>

        {step === "checkout" ? (
          <button
            onClick={handleGoToReview}
            className="w-full bg-blue-600 text-white py-2 rounded"
          >
            Ir a pagar
          </button>
        ) : (
          <button
            onClick={confirmOrder}
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-2 rounded disabled:bg-gray-400"
          >
            Confirmar pedido
          </button>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}
      </aside>

      {showAddressModal && (
        <AddressModal
          editing={editingAddress}
          close={() => setShowAddressModal(false)}
          reload={() => loadAddresses(true)}
        />
      )}
    </main>
  );
}
