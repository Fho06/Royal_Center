"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type AccountType =
  | "natural"
  | "extranjero"
  | "juridico"
  | "rif_persona_natural"
  | "rif_v"
  | "rif_e"
  | "gobierno"
  | "pasaporte";

type Gender = "femenino" | "masculino";

export default function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [accountType, setAccountType] =
    useState<AccountType>("natural");

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<Gender>("femenino");

  const [companyName, setCompanyName] = useState("");
  const [rif, setRif] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const isJuridico = accountType === "juridico";

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!phone || !rif || !termsAccepted) {
      setError("Missing required fields");
      return;
    }

    if (!isJuridico) {
      if (!firstName || !lastName) {
        setError("Enter first and last name");
        return;
      }
    }

    if (isJuridico) {
      if (!companyName) {
        setError("Enter company name");
        return;
      }
    }


    const draft = {
      phone, // without +58
      email,
      accountType,
      firstName,
      lastName,
      gender,
      companyName,
      rif,
      termsAccepted,
    };

    sessionStorage.setItem(
      "register_draft",
      JSON.stringify(draft)
    );

    const next = searchParams.get("next");
    if (next) sessionStorage.setItem("register_next", next);

    router.push(
      `/set-passcode?phone=${encodeURIComponent(phone)}`
    );
  }

  const nextParam = searchParams.get("next");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={handleContinue}
        className="w-full max-w-sm space-y-4 checkout-card p-6"
      >
        <h1 className="text-xl font-semibold">Crear una cuenta</h1>

        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        {/* ACCOUNT TYPE */}
        <select
          className="inside-card w-full rounded p-2"
          value={accountType}
          onChange={(e) =>
            setAccountType(e.target.value as AccountType)
          }
        >
          <option value="natural">Natural</option>
          <option value="extranjero">Extranjero</option>
          <option value="juridico">Jurídico</option>
          <option value="rif_persona_natural">RIF Persona Natural</option>
          <option value="rif_v">RIF-V</option>
          <option value="rif_e">RIF-E</option>
          <option value="gobierno">Gobierno</option>
          <option value="pasaporte">Pasaporte</option>
        </select>

        {/* PHONE */}
        <div className="flex">
          <span className="flex items-center rounded-l-md bg-[var(--reg-accent-soft)] -100 px-3 elevation-md">
            +58
          </span>
          <input
            type="tel"
            className="w-full inside-card !rounded-r-md !rounded-l-none p-2"
            placeholder="0123456789"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Email (opcional)"
          className="w-full inside-card p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* NATURAL PERSON INFO */}
        {!isJuridico && (
          <>
            <input
              type="text"
              placeholder="Nombre"
              className="w-full inside-card p-2"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />

            <input
              type="text"
              placeholder="Apellido"
              className="w-full inside-card p-2"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />

            <select
              className="w-full inside-card p-2"
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
            >
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
            </select>
          </>
        )}

        {/* COMPANY NAME (JURIDICO ONLY) */}
        {accountType === "juridico" && (
          <input
            type="text"
            placeholder="Company name"
            className="w-full inside-card p-2"
            value={companyName}
            onChange={(e) =>
              setCompanyName(e.target.value)
            }
            required
          />
        )}

        {/* RIF (ALWAYS REQUIRED) */}
        <input
          type="text"
          placeholder={
            accountType === "juridico"
              ? "Company RIF (ej. J123456789)"
              : "RIF (eg. V12345678)"
          }
          className="w-full inside-card p-2"
          value={rif}
          onChange={(e) => setRif(e.target.value)}
          required
        />

        {/* TERMS */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) =>
              setTermsAccepted(e.target.checked)
            }
            required
          />
          Acepto los Términos y Condiciones
        </label>

        <button
          type="submit"
          className="w-full rounded-lg bg-[var(--reg-accent)] elevation-md p-2 text-white font-bold"
        >
          Continuar
        </button>

        <p className="text-sm">
          ¿Ya tienes una cuenta?{" "}
          <a
            href={
              nextParam
                ? `/login?next=${encodeURIComponent(
                    nextParam
                  )}`
                : "/login"
            }
            className="underline"
          >
            Ir a iniciar sesión
          </a>
        </p>
      </form>
    </div>
  );
}
