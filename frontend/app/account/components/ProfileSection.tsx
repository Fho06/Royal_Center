"use client";

import { useState, useMemo } from "react";
import { apiRequest } from "@/lib/api";
import { Profile } from "../types";
import { Input } from "./Input";
import { Select } from "./Select";

/* =========================
   CONSTANTS
   ========================= */

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", 
  "Mayo", "Junio", "Julio", "Agosto",
  "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/* =========================
   HELPERS
   ========================= */

function getDaysInMonth(
  month: string | null,
  year: number | null
): string[] {
  if (!month) return [];

  const monthIndex = MONTHS.indexOf(month);
  if (monthIndex === -1) return [];

  const safeYear = year ?? 2000; // leap-safe fallback
  const days = new Date(safeYear, monthIndex + 1, 0).getDate();

  return Array.from({ length: days }, (_, i) => String(i + 1));
}

/* =========================
   COMPONENT
   ========================= */

function isAllowedEmail(email: string) {
  return (
    email.endsWith("@gmail.com") ||
    email.endsWith("@hotmail.com")
  );
}

export function ProfileSection({
  profile,
  setProfile,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  /* derived valid days */
  const dayOptions = useMemo(
    () => getDaysInMonth(profile.dob_month, profile.dob_year),
    [profile.dob_month, profile.dob_year]
  );

  async function save() {
    setSaving(true);

    await apiRequest("/profile", {
      method: "PUT",
      body: JSON.stringify({
        firstName: profile.first_name,
        lastName: profile.last_name,
        email: profile.email,
        dobDay: profile.dob_day,
        dobMonth: profile.dob_month,
        dobYear: profile.dob_year,
      }),
    });

    setSaving(false);

    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }



  return (
    <section className="space-y-4">
      {saved && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="animate-toast-in bg-white text-sm px-4 py-2 rounded-lg elevation-md border border-gray-200">
            ✅ Información guardada
          </div>
        </div>
      )}

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
        onChange={(v) => {
          const normalized = v.toLowerCase().trim();
          setProfile({ ...profile, email: normalized });

          if (!normalized) {
            setEmailError(null);
          } else if (!isAllowedEmail(normalized)) {
            setEmailError("Solo se aceptan correos @gmail.com o @hotmail.com");
          } else {
            setEmailError(null);
          }
        }}
      />
      {emailError && (
  <p className="text-sm text-red-600">
    {emailError}
  </p>
)}


      {/* DOB */}
      <div className="grid grid-cols-3 gap-3">
        {/* DAY */}
        <Select
          label="Día"
          value={profile.dob_day?.toString() ?? ""}
          options={dayOptions}
          onChange={(v) =>
            setProfile({
              ...profile,
              dob_day: Number(v),
            })
          }
          disabled={!profile.dob_month}
        />

        {/* MONTH */}
        <Select
          label="Mes"
          value={profile.dob_month ?? ""}
          options={MONTHS}
          onChange={(v) => {
            const validDays = getDaysInMonth(v, profile.dob_year);

            setProfile({
              ...profile,
              dob_month: v,
              dob_day:
                profile.dob_day &&
                validDays.includes(String(profile.dob_day))
                  ? profile.dob_day
                  : null,
            });
          }}
        />

        {/* YEAR (4-digit capped) */}
        <Input
          label="Año"
          value={profile.dob_year?.toString() ?? ""}
          onChange={(v) => {
            const cleaned = v.replace(/\D/g, "").slice(0, 4);
            const year = cleaned ? Number(cleaned) : null;

            const validDays = getDaysInMonth(
              profile.dob_month,
              year
            );

            setProfile({
              ...profile,
              dob_year: year,
              dob_day:
                profile.dob_day &&
                validDays.includes(String(profile.dob_day))
                  ? profile.dob_day
                  : null,
            });
          }}
        />
      </div>

      {/* SAVE */}
      <button
        onClick={save}
        disabled={saving}
        className="rounded-md elevation-md bg-[var(--reg-accent)] text-white px-4 py-2"
      >
        Guardar perfil
      </button>
    </section>
  );
}
