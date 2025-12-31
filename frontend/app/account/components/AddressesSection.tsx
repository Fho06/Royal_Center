"use client";

import { useState } from "react";
import { Address } from "../types";
import { AddressModal } from "./AddressModal";

export function AddressesSection({
  addresses,
  reload,
}: {
  addresses: Address[];
  reload: () => Promise<void>;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);

  return (
    <section className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Direcciones</h2>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="bg-black text-white px-3 py-2 rounded"
        >
          + Agregar dirección
        </button>
      </div>

      {addresses.map((a, i) => (
        <div key={a.address_id} className="border p-4 rounded relative">
          {a.is_default && (
            <span className="absolute top-2 right-2 text-xs bg-black text-white px-2 py-1 rounded">
              Predeterminada
            </span>
          )}

          <div className="font-semibold mb-1">
            Dirección {i + 1} {a.label && `(${a.label})`}
          </div>

          <div className="text-sm">
            <div>{a.address_1}</div>
            {a.address_2 && <div>{a.address_2}</div>}
            <div>{a.city}, {a.state}</div>
            <div>{a.municipio}, {a.country}</div>
          </div>

          <button
            onClick={() => {
              setEditing(a);
              setModalOpen(true);
            }}
            className="text-blue-600 text-sm mt-2"
          >
            Editar
          </button>
        </div>
      ))}

      {modalOpen && (
        <AddressModal
          editing={editing}
          close={() => setModalOpen(false)}
          reload={reload}
        />
      )}
    </section>
  );
}
