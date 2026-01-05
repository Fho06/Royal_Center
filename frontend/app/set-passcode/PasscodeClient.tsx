"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

export default function PasscodeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  // phone WITHOUT +58 (backend will normalize)
  const phone = searchParams.get("phone");

  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!phone) {
      setError("Sesión inválida. Regístrese de nuevo.");
      return;
    }

    if (!/^\d{4}$/.test(passcode)) {
      setError("El código debe tener 4 dígitos");
      return;
    }

    try {
      setLoading(true);

      const data = await apiRequest("/auth/register-complete", {
        method: "POST",
        body: JSON.stringify({
          phone,      // raw digits only
          passcode,   // backend hashes
        }),
      });

      // ✅ AUTO LOGIN
      login(data.token);

      router.push("/account");
    } catch (err: any) {
      setError(err.message || "No se pudo completar el registro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 checkout-card p-6"
      >
        <h1 className="text-xl font-semibold text-center">
          Crear clave
        </h1>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <input
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          placeholder="••••"
          className="w-full inside-card p-3 text-center tracking-[0.4em]"
          value={passcode}
          onChange={(e) =>
            setPasscode(e.target.value.replace(/\D/g, ""))
          }
          required
          autoFocus
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[var(--reg-accent)] p-2 text-white font-bold disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Finalizar"}
        </button>
      </form>
    </div>
  );
}
