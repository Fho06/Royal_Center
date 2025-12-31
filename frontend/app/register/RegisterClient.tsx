"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type AccountType = "natural" | "juridico";
type Gender = "male" | "female";

export default function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [accountType, setAccountType] = useState<AccountType>("natural");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<Gender>("male");

  const [companyName, setCompanyName] = useState("");
  const [rif, setRif] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!phone || !termsAccepted) {
      setError("Missing required fields");
      return;
    }

    if (accountType === "natural") {
      if (!firstName || !lastName) {
        setError("Enter first and last name");
        return;
      }
    } else {
      if (!companyName || !rif) {
        setError("Enter company name and RIF");
        return;
      }
    }

    // Store draft registration locally (until passcode is set)
    const draft = {
      phone, // WITHOUT +58
      email,
      accountType,
      firstName,
      lastName,
      gender,
      companyName,
      rif,
      termsAccepted,
    };

    sessionStorage.setItem("register_draft", JSON.stringify(draft));

    // Keep your "next" behavior for after login if you want later
    const next = searchParams.get("next");
    if (next) sessionStorage.setItem("register_next", next);

    router.push(`/set-passcode?phone=${encodeURIComponent(phone)}`);
  }

  const nextParam = searchParams.get("next");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={handleContinue}
        className="w-full max-w-sm space-y-4 rounded border p-6"
      >
        <h1 className="text-xl font-semibold">Create Account</h1>

        {error && <p className="text-red-600">{error}</p>}

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

        <div className="flex">
          <span className="flex items-center rounded-l border px-3 bg-gray-100">
            +58
          </span>
          <input
            type="tel"
            className="w-full rounded-r border p-2"
            placeholder="4121234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <input
          type="email"
          placeholder="Email (optional)"
          className="w-full rounded border p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {accountType === "natural" && (
          <>
            <input
              type="text"
              placeholder="First name"
              className="w-full rounded border p-2"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Last name"
              className="w-full rounded border p-2"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            <select
              className="w-full rounded border p-2"
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </>
        )}

        {accountType === "juridico" && (
          <>
            <input
              type="text"
              placeholder="Company name"
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

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            required
          />
          I accept the Terms & Conditions
        </label>

        <button type="submit" className="w-full rounded bg-black p-2 text-white">
          Continue
        </button>

        <p className="text-sm">
          Already have an account?{" "}
          <a
            href={
              nextParam
                ? `/login?next=${encodeURIComponent(nextParam)}`
                : "/login"
            }
            className="underline"
          >
            Go to login
          </a>
        </p>
      </form>
    </div>
  );
}
