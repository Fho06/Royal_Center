"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  checkPhoneUnique,
  checkRifUnique,
  registerStart,
  sendOtp,
} from "../utils/registerApi";

export type AccountType =
  | "natural"
  | "extranjero"
  | "juridico"
  | "rif_persona_natural"
  | "rif_v"
  | "rif_e"
  | "gobierno"
  | "pasaporte";

export type Gender = "femenino" | "masculino";

const RIF_PREFIX_BY_ACCOUNT: Record<AccountType, "" | "V" | "E" | "J" | "G"> = {
  natural: "V",
  extranjero: "E",
  juridico: "J",
  rif_persona_natural: "V",
  rif_v: "V",
  rif_e: "E",
  gobierno: "G",
  pasaporte: "",
};

export function useRegisterForm({ nextParam }: { nextParam: string | null }) {
  const router = useRouter();

  const [accountType, setAccountType] = useState<AccountType>("natural");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<Gender>("femenino");
  const [companyName, setCompanyName] = useState("");
  const [rifDigits, setRifDigits] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [rifError, setRifError] = useState("");

  const isJuridico = accountType === "juridico";
  const rifPrefix = RIF_PREFIX_BY_ACCOUNT[accountType];
  const fullRif = rifPrefix ? `${rifPrefix}${rifDigits}` : rifDigits;

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setRegistering(true);
    setError("");
    setPhoneError("");
    setRifError("");

    if (!phone) return fail(setPhoneError, "Ingrese su número");
    if (!rifDigits) return fail(setRifError, "Ingrese identificación");
    if (!/^\d{8}$/.test(rifDigits))
      return fail(setRifError, "Debe contener 8 dígitos");
    if (!termsAccepted)
      return fail(setError, "Debe aceptar los términos");

    if (!isJuridico && (!firstName || !lastName))
      return fail(setError, "Ingrese nombre y apellido");

    if (isJuridico && !companyName)
      return fail(setError, "Ingrese empresa");

    if (!(await checkPhoneUnique(phone)))
      return fail(setPhoneError, "Número ya registrado");

    if (!(await checkRifUnique(fullRif)))
      return fail(setRifError, "Identificación ya registrada");

    await registerStart({
      phone,
      email,
      accountType,
      firstName,
      lastName,
      gender,
      companyName,
      rif: fullRif,
    });

    await sendOtp(phone);

    if (nextParam) sessionStorage.setItem("register_next", nextParam);

    router.push(`/set-passcode?phone=${encodeURIComponent(phone)}`);
  }

  function fail(fn: (v: string) => void, msg: string) {
    fn(msg);
    setRegistering(false);
    return;
  }

    return {
    accountType,
    setAccountType,
    phone,
    setPhone,
    email,
    setEmail,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    gender,
    setGender,
    companyName,
    setCompanyName,
    rifDigits,
    setRifDigits,
    setRifError,   // ✅ ADD THIS
    termsAccepted,
    setTermsAccepted,
    isJuridico,
    rifPrefix,
    registering,
    error,
    phoneError,
    rifError,
    handleContinue,
    };
}
