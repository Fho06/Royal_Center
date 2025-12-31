"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { Address } from "../types";
import { Input } from "@/app/account/components/Input";

/* =========================
   TYPES
   ========================= */

type AddressForm = {
  label: string;
  address_1: string;
  address_2: string;
  country: string;
  state: string;
  city: string;
  municipio: string;
  is_default: boolean;
};

/* =========================
   CONSTANTS
   ========================= */

const REQUIRED_FIELDS: (keyof AddressForm)[] = [
  "address_1",
  "state",
  "city",
  "municipio"
];

const emptyAddress: AddressForm = {
  label: "",
  address_1: "",
  address_2: "",
  country: "VENEZUELA",
  state: "",
  city: "",
  municipio: "",
  is_default: false,
};

const FIELD_LABELS_ES: Record<keyof AddressForm, string> = {
  label: "Etiqueta",
  address_1: "Dirección",
  address_2: "Dirección adicional (opcional)",
  country: "País",
  state: "Estado",
  city: "Ciudad",
  municipio: "Municipio (opcional)",
  is_default: "Dirección predeterminada",
};

const FIELD_ORDER: (keyof AddressForm)[] = [
  "label",
  "address_1",
  "address_2",
  "country",
  "state",
  "city",
  "municipio",
  "is_default",
];

/* =========================
   COMPONENT
   ========================= */

export function AddressModal({
  editing,
  close,
  reload,
}: {
  editing: Address | null;
  close: () => void;
  reload: () => Promise<void>;
}) {
  const [form, setForm] = useState<AddressForm>(
    editing
      ? {
          label: editing.label ?? "",
          address_1: editing.address_1,
          address_2: editing.address_2 ?? "",
          country: editing.country,
          state: editing.state,
          city: editing.city,
          municipio: editing.municipio,
          is_default: editing.is_default,
        }
      : emptyAddress
  );

  const [missing, setMissing] = useState<
    Partial<Record<keyof AddressForm, boolean>>
  >({});

  async function save() {
    const newMissing: Partial<Record<keyof AddressForm, boolean>> = {};

    REQUIRED_FIELDS.forEach((key) => {
      const value = form[key];
      if (typeof value !== "string" || value.trim() === "") {
        newMissing[key] = true;
      }
    });

    if (Object.keys(newMissing).length > 0) {
      setMissing(newMissing);
      return;
    }

    setMissing({});

    if (editing) {
      await apiRequest(`/addresses/${editing.address_id}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
    } else {
      await apiRequest("/addresses", {
        method: "POST",
        body: JSON.stringify(form),
      });
    }

    close();
    await reload();
  }

  async function remove() {
    if (!editing) return;

    const confirmed = window.confirm(
      "¿Eliminar esta dirección? Esta acción no se puede deshacer."
    );

    if (!confirmed) return;

    await apiRequest(`/addresses/${editing.address_id}`, {
      method: "DELETE",
    });

    close();
    await reload();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {editing ? "Editar dirección" : "Agregar dirección"}
          </h3>

          {editing && (
            <button
              onClick={remove}
              className="text-sm text-red-600"
            >
              Eliminar
            </button>
          )}
        </div>

        {FIELD_ORDER.map((key) =>
          key === "is_default" ? (
            <label key={key} className="flex gap-2 items-center">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) =>
                  setForm({ ...form, is_default: e.target.checked })
                }
              />
              {FIELD_LABELS_ES.is_default}
            </label>
          ) : key === "country" ? (
            <div key={key}>
              <div className="text-sm font-semibold mb-1">
                {FIELD_LABELS_ES.country}
              </div>
              <div className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-700 cursor-not-allowed">
                Venezuela
              </div>
            </div>
          ) : (
            <Input
              key={key}
              label={FIELD_LABELS_ES[key]}
              value={form[key]}
              placeholder={
                missing[key] ? "Información necesaria" : undefined
              }
              error={missing[key]}
              onChange={(val) => {
                setForm({ ...form, [key]: val });
                if (missing[key]) {
                  setMissing({ ...missing, [key]: false });
                }
              }}
            />
          )
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={close}
            className="flex-1 border rounded py-2"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            className="flex-1 bg-black text-white rounded py-2"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
