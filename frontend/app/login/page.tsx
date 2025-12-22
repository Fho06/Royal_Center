"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { saveToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const data = await apiRequest("/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(), // optional frontend normalize
          password,
        }),
      });

      saveToken(data.token);
      router.push("/");
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
        <h1 className="text-xl font-semibold">Login</h1>

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
          placeholder="Password"
          className="w-full rounded border p-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full rounded bg-black p-2 text-white"
        >
          Log In
        </button>

        <p className="text-sm">
          Don’t have an account?{" "}
          <a href="/register" className="underline">
            Sign up
          </a>
        </p>
      </form>
    </div>
  );
}
