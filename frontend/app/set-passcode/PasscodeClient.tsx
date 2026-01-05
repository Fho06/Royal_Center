"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

export default function PasscodeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const phone = searchParams.get("phone"); // WITHOUT +58
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!phone) {
      setError("Missing phone number");
      return;
    }

    if (!/^\d{4}$/.test(passcode)) {
      setError("Passcode must be 4 digits");
      return;
    }

    
    const raw = sessionStorage.getItem("register_draft");
    if (!raw) {
      setError("La sesión de registro ha expirado. Regístrese de nuevo.");
      return;
    }

    const draft = JSON.parse(raw);

    // Safety: prevent mismatched phones
    if (draft.phone !== phone) {
      setError("Phone mismatch. Please register again.");
      return;
    }

    try {
      const data = await apiRequest("/auth/register-complete", {
        method: "POST",
        body: JSON.stringify({
          ...draft,
          passcode,
        }),
      });

      // ✅ AUTO LOGIN
      login(data.token);

      sessionStorage.removeItem("register_draft");

      const next = sessionStorage.getItem("register_next");
      sessionStorage.removeItem("register_next");

      router.push(next || "/account");
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 checkout-card p-6"
      >
        <h1 className="text-xl font-semibold">Set Passcode</h1>

        {error && <p className="text-red-600">{error}</p>}

        <input
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          placeholder="4-digit passcode"
          className="w-full inside-card p-2 text-center tracking-widest"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          required
        />
 
        <button
          type="submit"
          className="w-full rounded-xl bg-[var(--reg-accent)] p-2 text-white font-bold "
        >
          Finish
        </button>
      </form>
    </div>
  );
}
