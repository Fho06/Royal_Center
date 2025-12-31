"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { Profile } from "../types";
import { Input } from "./Input";
import { Select } from "./Select";

/* =========================
   CONSTANTS
   ========================= */

const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

/* =========================
   COMPONENT
   ========================= */

export function ProfileSection({
  profile,
  setProfile,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
}) {
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await apiRequest("/profile", {
      method: "PUT",
      body: JSON.stringify({
        firstName: profile.first_name,
        lastName: profile.last_name,
        dobDay: profile.dob_day,
        dobMonth: profile.dob_month,
        dobYear: profile.dob_year,
      }),
    });
    setSaving(false);
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Cuenta de Perfil</h1>

      {/* NAME */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nombres"
          value={profile.first_name ?? ""}
          onChange={(v) =>
            setProfile({ ...profile, first_name: v })
          }
        />
        <Input
          label="Apellidos"
          value={profile.last_name ?? ""}
          onChange={(v) =>
            setProfile({ ...profile, last_name: v })
          }
        />
      </div>

      {/* PHONE (READ ONLY) */}
      <Input
        label="Teléfono"
        value={profile.phone ?? ""}
        onChange={() => {}}
        disabled
      />

      {/* EMAIL */}
      <Input
        label="Correo electrónico"
        value={profile.email ?? ""}
        onChange={(v) =>
          setProfile({ ...profile, email: v })
        }
      />

      {/* DOB */}
      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Día"
          value={profile.dob_day ?? ""}
          onChange={(v) =>
            setProfile({
              ...profile,
              dob_day: Number(v) || null,
            })
          }
        />
        <Select
          label="Mes"
          value={profile.dob_month ?? ""}
          options={MONTHS}
          onChange={(v) =>
            setProfile({ ...profile, dob_month: v })
          }
        />
        <Input
          label="Año"
          value={profile.dob_year ?? ""}
          onChange={(v) =>
            setProfile({
              ...profile,
              dob_year: Number(v) || null,
            })
          }
        />
      </div>

      {/* SAVE */}
      <button
        onClick={save}
        disabled={saving}
        className="rounded bg-black text-white px-4 py-2"
      >
        Guardar perfil
      </button>
    </section>
  );
}
