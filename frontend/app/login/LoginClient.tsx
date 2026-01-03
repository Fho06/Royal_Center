"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [phone, setPhone] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!/^\d{4}$/.test(passcode)) {
      setError("Passcode must be 4 digits");
      return;
    }

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          phone,
          passcode,
        }),
      });

      login(data.token);

      const next = searchParams.get("next");
      router.push(next || "/");
    } catch (err: any) {
      setError(err.message);
    }
  }

  const nextParam = searchParams.get("next");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 checkout-card r p-6"
      >
        <h1 className="text-xl font-semibold">Iniciar sesión</h1>

        {error && <p className="text-red-600">{error}</p>}

        {/* PHONE */}
        <div className="flex">
          <span className="flex items-center rounded-l-md bg-[var(--reg-accent-soft)] -100 px-3 elevation-md">
            +58
          </span>
          <input
            type="tel"
            placeholder="0123456789"
            className="w-full inside-card !rounded-r-md !rounded-l-none p-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        {/* PASSCODE */}
        <input
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          placeholder="Código de Acceso (4 Dígitos)"
          className="w-full checkout-card p-2 text-center tracking-widest"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full rounded-lg bg-[var(--reg-accent)] p-2 text-white font-bold"
        >
          Iniciar sesión
        </button>

        <p className="text-sm">
          ¿No tienes una cuenta?{" "}
          <a
            href={
              nextParam
                ? `/register?next=${encodeURIComponent(nextParam)}`
                : "/register"
            }
            className="underline"
          >
            Registrar Cuenta
          </a>
        </p>
      </form>
    </div>
  );
}
