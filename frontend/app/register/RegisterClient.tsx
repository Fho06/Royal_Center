"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function RegisterClient() {
  const router = useRouter();

  const [accountType, setAccountType] = useState<"natural" | "juridico">(
    "natural"
  );

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");

  const [companyName, setCompanyName] = useState("");
  const [rif, setRif] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          phone: `+58${phone}`,
          email,
          accountType,
          firstName,
          lastName,
          gender,
          companyName,
          rif,
          termsAccepted,
        }),
      });

      // Next step in flow, CHANGE TO OTP LATER****
      router.push(`/set-passcode?phone=${phone}`);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded border p-6"
      >
        <h1 className="text-xl font-semibold">Create Account</h1>

        {error && <p className="text-red-600">{error}</p>}

        {/* ACCOUNT TYPE */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAccountType("natural")}
            className={`flex-1 rounded p-2 ${
              accountType === "natural" ? "bg-black text-white" : "border"
            }`}
          >
            Natural
          </button>
          <button
            type="button"
            onClick={() => setAccountType("juridico")}
            className={`flex-1 rounded p-2 ${
              accountType === "juridico" ? "bg-black text-white" : "border"
            }`}
          >
            Jurídico
          </button>
        </div>

        {/* PHONE */}
        <div className="flex">
          <span className="flex items-center rounded-l border px-3 bg-gray-100">
            +58
          </span>
          <input
            type="tel"
            className="w-full rounded-r border p-2"
            placeholder="0123456789"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Correo Electrónico (opcional)"
          className="w-full rounded border p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* NATURAL */}
        {accountType === "natural" && (
          <>
            <input
              type="text"
              placeholder="Nombre"
              className="w-full rounded border p-2"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />

            <input
              type="text"
              placeholder="Apellido"
              className="w-full rounded border p-2"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />

            <select
              className="w-full rounded border p-2"
              value={gender}
              onChange={(e) => setGender(e.target.value as "male" | "female")}
            >
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
            </select>
          </>
        )}

        {/* JURIDICO */}
        {accountType === "juridico" && (
          <>
            <input
              type="text"
              placeholder="Nombre de la Compañía"
              className="w-full rounded border p-2"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />

            <input
              type="text"
              placeholder="RIF (e.g. J123456789)"
              className="w-full rounded border p-2"
              value={rif}
              onChange={(e) => setRif(e.target.value)}
              required
            />
          </>
        )}

        {/* TERMS */}
        <label className="flex items-center gap-2 text-sm pl-10">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            required
          />
          Acepto los Términos y Condiciones
        </label>

        <button
          type="submit"
          className="w-full rounded bg-black p-2 text-white"
        >
          Continue
        </button>
        {/* HAVE ACCOUNT */}
          <p className="text-center text-sm text-gray-600">
            ¿Ya tienes una cuenta?{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="font-medium text-black underline"
            >
              Iniciar sesión
            </button>
          </p>
      </form>
    </div>
  );
}
