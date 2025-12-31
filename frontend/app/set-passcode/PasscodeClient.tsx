"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";

export default function PasscodeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // phone must be passed as ?phone=4121234567
  const phone = searchParams.get("phone");

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

    try {
      await apiRequest("/auth/set-passcode", {
        method: "POST",
        body: JSON.stringify({
          phone,
          passcode,
        }),
      });

      router.push("/account");
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
        <h1 className="text-xl font-semibold">Set Passcode</h1>

        {error && <p className="text-red-600">{error}</p>}

        <input
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          placeholder="4-digit passcode"
          className="w-full rounded border p-2 text-center tracking-widest"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full rounded bg-black p-2 text-white"
        >
          Finish
        </button>
      </form>
    </div>
  );
}
