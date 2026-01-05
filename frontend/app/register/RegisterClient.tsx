"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AccountRegistering } from "./components/AccountRegistering";


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

const RIF_PREFIX_BY_ACCOUNT: Record<AccountType, "" | "V" | "E" | "J" | "G"> = {
  natural: "V",
  extranjero: "E",
  juridico: "J",
  rif_persona_natural: "V",
  rif_v: "V",
  rif_e: "E",
  gobierno: "G",
  pasaporte: "", // ✅ no prefix
};

export default function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [accountType, setAccountType] =
    useState<AccountType>("natural");

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [registering, setRegistering] = useState(false);


  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<Gender>("femenino");

  const [companyName, setCompanyName] = useState("");
  const [rifDigits, setRifDigits] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [rifError, setRifError] = useState("");


  const isJuridico = accountType === "juridico";

  const rifPrefix = RIF_PREFIX_BY_ACCOUNT[accountType];
  const fullRif = rifPrefix ? `${rifPrefix}${rifDigits}` : rifDigits;


  async function checkPhoneUnique(phone: string): Promise<boolean> {
    const res = await fetch(
      `/api/auth/check-phone?phone=${encodeURIComponent(phone)}`
    );

    if (!res.ok) {
      // fail closed: block continuation
      return false;
    }

    const data = await res.json();
    return !data.exists; // true = OK to continue
  }

  async function checkRifUnique(rif: string): Promise<boolean> {
    const res = await fetch(
      `/api/auth/check-rif?rif=${encodeURIComponent(rif)}`
    );

    if (!res.ok) {
      // fail closed: block continuation
      return false;
    }

    const data = await res.json();

    // backend may return { exists, invalid }
    if (data.invalid) return false;

    return !data.exists; // true = OK to continue
  }

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setRegistering(true);

    // reset errors
    setPhoneError("");
    setRifError("");
    setError("");

    if (!phone) {
      setPhoneError("Ingrese su número de teléfono");
      setRegistering(false);
      return;
    }

    if (!rifDigits) {
      setRifError("Ingrese su identificación");
      setRegistering(false);
      return;
    }

    if (!/^\d{8}$/.test(rifDigits)) {
      setRifError("Debe contener exactamente 8 dígitos");
      setRegistering(false);
      return;
    }

    if (!termsAccepted) {
      setError("Debe aceptar los términos y condiciones");
      setRegistering(false);
      return;
    }

    if (!isJuridico && (!firstName || !lastName)) {
      setError("Ingrese nombre y apellido");
      setRegistering(false);
      return;
    }

    if (isJuridico && !companyName) {
      setError("Ingrese el nombre de la empresa");
      setRegistering(false);
      return;
    }

    // 🔴 BLOCK IF PHONE EXISTS
    const phoneIsUnique = await checkPhoneUnique(phone);
    if (!phoneIsUnique) {
      setPhoneError(
        "Este número ya está registrado. Intente iniciar sesión."
      );
      setRegistering(false);
      return;
    }

    // 🔴 BLOCK IF RIF EXISTS
    const rifIsUnique = await checkRifUnique(fullRif);
    if (!rifIsUnique) {
      setRifError("Esta identificación ya está registrada.");
      setRegistering(false);
      return;
    }

    // ✅ ALL CHECKS PASSED — CONTINUE
    const draft = {
      phone,
      email,
      accountType,
      firstName,
      lastName,
      gender,
      companyName,
      rif: fullRif,
      termsAccepted,
    };

    sessionStorage.setItem(
      "register_draft",
      JSON.stringify(draft)
    );

    const next = searchParams.get("next");
    if (next) sessionStorage.setItem("register_next", next);

    // 1️⃣ CREATE USER (inactive)
    const res = await fetch("/api/auth/register-start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: `+58${phone}`,
        email,
        accountType,
        firstName,
        lastName,
        gender,
        companyName,
        rif: fullRif,
      }),
    });

    if (!res.ok) {
      setError("No se pudo iniciar el registro");
      setRegistering(false);
      return;
    }

    // 2️⃣ SEND OTP
    await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: `+58${phone}`,
      }),
    });

    // 3️⃣ GO TO VERIFY
    router.push(
      `/verify-otp?phone=${encodeURIComponent(phone)}`
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
         onChange={(e) => {
            setAccountType(e.target.value as AccountType);
            setRifDigits("");
            setRifError("");
          }}
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
        <div>
          <div className="flex">
            <span className="flex items-center rounded-l-md bg-[var(--reg-accent-soft)] px-3 elevation-md">
              +58
            </span>
            <input
              type="tel"
              className="w-full inside-card !rounded-r-md !rounded-l-none p-2"
              placeholder="4121234567"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, ""));
                if (phoneError) setPhoneError("");
              }}
              required
            />
          </div>

          {phoneError && (
            <p className="text-red-600 text-xs mt-1">
              {phoneError}
            </p>
          )}
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
              onChange={(e) =>
                setGender(e.target.value as Gender)
              }
            >
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
            </select>
          </>
        )}

        {/* COMPANY NAME (JURIDICO ONLY) */}
        {isJuridico && (
          <input
            type="text"
            placeholder="Nombre de la empresa"
            className="w-full inside-card p-2"
            value={companyName}
            onChange={(e) =>
              setCompanyName(e.target.value)
            }
            required
          />
        )}

        {/* RIF / PASSPORT */}
        <div className="flex">
          {rifPrefix && (
            <span className="flex items-center rounded-l-md bg-[var(--reg-accent-soft)] px-3 elevation-md">
              {rifPrefix}
            </span>
          )}
          <input
            type="text"
            inputMode="numeric"
            maxLength={8}
            className={`w-full inside-card p-2 ${
              rifPrefix ? "!rounded-l-none" : ""
            }`}
            placeholder="12345678"
            value={rifDigits}
            onChange={(e) => {
            setRifDigits(
              e.target.value.replace(/\D/g, "").slice(0, 8)
            );
            if (rifError) setRifError("");
          }}
            required
          />
        </div>
        {rifError && (
            <p className="text-red-600 text-xs mt-1">
              {rifError}
            </p>
          )}

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
          disabled={registering}
          className="w-full rounded-lg bg-[var(--reg-accent)] elevation-md p-2 text-white font-bold"
        >
          Continuar
        </button>
        {registering && <AccountRegistering />}

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
