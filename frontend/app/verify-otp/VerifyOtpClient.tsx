"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";

export default function VerifyOtpClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // phone WITHOUT +58 (consistent with your routing)
  const phone = searchParams.get("phone");

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!phone) {
      setError("Sesión inválida. Regístrese de nuevo.");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError("El código debe tener 6 dígitos");
      return;
    }

    try {
      setLoading(true);

      await apiRequest("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          phone, // backend will normalize to +58
          otp,
        }),
      });

      // ✅ OTP verified → continue to passcode
      router.push(`/set-passcode?phone=${encodeURIComponent(phone)}`);
    } catch (err: any) {
      setError(err.message || "Código inválido");
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
          Verificar código
        </h1>

        <p className="text-sm text-center text-gray-500">
          Enviamos un código SMS a <br />
          <span className="font-medium">{phone}</span>
        </p>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {/* MASKED OTP INPUT */}
        <input
          type="password"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          placeholder="••••••"
          className="w-full inside-card p-3 text-center text-xl tracking-[0.4em]"
          value={otp}
          onChange={(e) =>
            setOtp(e.target.value.replace(/\D/g, ""))
          }
          autoFocus
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[var(--reg-accent)] p-2 text-white font-bold disabled:opacity-60"
        >
          {loading ? "Verificando..." : "Verificar"}
        </button>
      </form>
    </div>
  );
}
