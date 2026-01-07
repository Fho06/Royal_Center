"use client";

import { useSearchParams } from "next/navigation";
import { useRegisterForm } from "./hook/useRegisterForm";
import {
  AccountTypeSelect,
  PhoneInput,
  NaturalPersonFields,
  JuridicoFields,
  RifInput,
  TermsCheckbox,
  SubmitButton,
} from "./components";
import { AccountRegistering } from "./components/AccountRegistering";

export default function RegisterClient() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");

  const form = useRegisterForm({ nextParam });

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={form.handleContinue}
        className="w-full max-w-sm space-y-4 checkout-card p-6"
      >
        <h1 className="text-xl font-semibold">Crear una cuenta</h1>

        {form.error && (
          <p className="text-red-600 text-sm">{form.error}</p>
        )}

        <AccountTypeSelect {...form} />
        <PhoneInput {...form} />
        <input
          type="email"
          placeholder="Email (opcional)"
          className="w-full inside-card p-2"
          value={form.email}
          onChange={(e) => form.setEmail(e.target.value)}
        />

        {!form.isJuridico ? (
          <NaturalPersonFields {...form} />
        ) : (
          <JuridicoFields {...form} />
        )}

        <RifInput {...form} />
        <TermsCheckbox {...form} />
        <SubmitButton registering={form.registering} />

        {form.registering && <AccountRegistering />}

        <p className="text-sm">
          ¿Ya tienes una cuenta?{" "}
          <a
            href={
              nextParam
                ? `/login?next=${encodeURIComponent(nextParam)}`
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
