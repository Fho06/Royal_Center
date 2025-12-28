"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const next = searchParams.get("next");
      router.push(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
    } catch (err: any) {
      setError(err.message);
    }
  }

  const next = searchParams.get("next");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded border p-6"
      >
        <h1 className="text-xl font-semibold">Create Account</h1>

        {error && <p className="text-red-600">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          className="w-full rounded border p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password (min 6 chars)"
          className="w-full rounded border p-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full rounded bg-black p-2 text-white"
        >
          Register
        </button>

        <p className="text-sm">
          Already have an account?{" "}
          <a
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="underline"
          >
            Go back to login
          </a>
        </p>
      </form>
    </div>
  );
}
