"use client";

type Address = {
  address_id: number;
  label: string | null;
  address_1: string;
  address_2: string | null;
  country: string;
  state: string;
  city: string;
  municipio: string;
  is_default: boolean;
};

type Props = {
  addresses: Address[];
  selectedAddressId: number | null;
  setSelectedAddressId: (id: number) => void;
  onAdd: () => void;
  onEdit: (addr: Address) => void;
};

export function AddressSelector({
  addresses,
  selectedAddressId,
  setSelectedAddressId,
  onAdd,
  onEdit,
}: Props) {
  const selected = addresses.find(a => a.address_id === selectedAddressId);

  if (addresses.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No tienes direcciónes guardadas.
        <button
          onClick={onAdd}
          className="block mt-2 text-blue-600 text-sm"
        >
          ➕ Agregar dirección
        </button>
      </div>
    );
  }

  return (
    <>
      <select
        value={selectedAddressId ?? ""}
        onChange={(e) => {
          if (e.target.value === "__add__") return onAdd();
          setSelectedAddressId(Number(e.target.value));
        }}
        className="w-full border rounded px-3 py-2 text-sm"
      >
        <option value="" disabled>
          Selecciona una dirección
        </option>

        {addresses.map(addr => (
          <option key={addr.address_id} value={addr.address_id}>
            {addr.label || addr.address_1}
            {addr.is_default ? " (Predeterminada)" : ""}
          </option>
        ))}

        <option value="__add__">➕ Agregar nueva dirección</option>
      </select>

      {selected && (
        <div className="text-sm text-gray-600 border rounded p-2 mt-2">
          <div className="flex justify-between">
            <div>
              <div>{selected.address_1}</div>
              {selected.address_2 && <div>{selected.address_2}</div>}
              <div>{selected.city}, {selected.state}</div>
              <div>{selected.municipio}, {selected.country}</div>
            </div>

            <button
              onClick={() => onEdit(selected)}
              className="elevation-md bg-[var(--navbar-accent-soft)] text-white px-2 h-8 rounded-md pt-"
            >
              Editar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
